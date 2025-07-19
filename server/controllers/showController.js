import axios from 'axios';
import Movie from '../models/Movie.js';
import Show from '../models/Show.js';



//api to get now playing movies
export const getNowPlayingMovies = async(req,res) =>{
  try {
   const {data}= await axios.get('https://api.themoviedb.org/3/movie/now_playing',{
        headers:{Authorization:`Bearer ${process.env.TMDB_API_KEY}`}
    })

    const movies = data.results;
    res.json({success: true, movies:movies})
    
  } catch (error) {
     console.error(error);
      res.json({success: false,message: error.message})
   

  }
}

//api to add a new show
export const addShow = async (req, res) => {

  try {
    console.log(" addShow hit with body:",req.body);
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    if (!movie) {
      // fetch movie details from tmdb
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      // Add movie to database
      movie = await Movie.create(movieDetails);
    }

    // ✅ Declare showsToCreate outside
    const showsToCreate = [];

    // ✅ Use single for...of loop
    for (let show of showsInput) {


      const showDate = show.date;
      const showTimes = show.time;

      if (Array.isArray(showTimes)) {

        for (let time of showTimes) {
          const dateTimeString = `${showDate}T${time}`;
          showsToCreate.push({
            movie: movieId,
            showDateTime: new Date(dateTimeString),
            showPrice,
            occupiedSeats: [],
          });
        }
      }
    }

    if (showsToCreate.length > 0) {
    await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: 'Show Added Succesfully.' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};


//API to get all shows from database

export const getShows = async(req,res) =>{
    try {
       const shows= await Show.find({showDateTime :{$gte : new Date()}}).populate('movie').sort({showDateTime:1});

        //filter uniqueShows
        const uniqueShows= new Set(shows.map(show => show.movie))

        res.json({success:true,shows: Array.from(uniqueShows)})
    } catch (error) {
        console.error(error);
        res.json({success:false,message:error.message});
    }
}

//API to get a single show from the db
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    // Get all upcoming shows for the movie
    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() }
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {}; // Group shows by date

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!dateTime[date]) {
        dateTime[date] = [];
      }

      dateTime[date].push({time:show.showDateTime,showId:show._id});
    });

    res.json({
      success: true,
      movie,
      dateTime,
    });

  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};
