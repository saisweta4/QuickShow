import {Inngest} from "inngest";
import User from "../models/user.js";
import connectDB from "../configs/db.js"; 
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodemailer.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

//Inngest function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    try {
      await connectDB();
      console.log("✅ DB Connected");

      const data = event.data;

      console.log("📥 Event data:", data);

      const userData = {
        _id: data.id,
        email: data.email_addresses?.[0]?.email_address || "no-email@clerk.dev",
        name: `${data.first_name || ""} ${data.last_name || ""}`,
        image: data.image_url || "",
      };

      console.log("📤 Attempting to create user:", userData);

      const result = await User.create(userData);
      console.log("✅ User inserted:", result);
    } catch (err) {
      console.error("❌ Failed to insert user:", err.message);
      console.error(err.stack);
    }
  }
);

//Inngest function to delete user from database

const syncUserDeletion=inngest.createFunction(
    {id:'delete-user-from-clerk'},
    {event:'clerk/user.deleted'},

    async ({event}) =>{
         await connectDB(); 
       const{id}=event.data
       await User.findByIdAndDelete(id)
    }
)

//Inngest function to update user data in database
const syncUserUpdation =inngest.createFunction(
    {id:'update-user-from-clerk'},
    {event:'clerk/user.updated'},

    async ({event}) =>{
         await connectDB(); 

         console.log("📦 Full event data:", event.data);
        const {id,first_name,last_name,email_addresses,image_url} = event.data
         const email = email_addresses?.[0]?.email_address || "";
          const userData = {
            _id: id,
           email,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.findByIdAndUpdate(id,userData);

    }
)

//Inngest function to cancel booking and release seats of show after 10 minute of booking created if payment is not made

const releaseSeatsAndDeletebooking = inngest.createFunction(
  {id:'release-seats-delete-booking'},
  {event:"app/checkpayment"},
  async ({event,step})=>{
    const tenMinutesLater= new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil('wait-for-10-minutes',tenMinutesLater);

    await step.run('check-payment-status', async () =>{
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId)

      //if payment is not made,release seats and delete booking

      if(!booking.isPaid){
        const show = await Show.findById(booking.show);
        booking.bookedSeats.forEach((seat)=>{
          delete show.occupiedSeats[seat]
        });
        show.markModified('occupiedSeats')
        await show.save()
        await Booking.findByIdAndDelete(booking._id)
      }
    })
  }
)

//Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
  {id:"send-booking-confirmation-email"},
  {event: "app/show.booked"},
  async({event,step}) =>{
    const {bookingId} = event.data;

    const booking = await Booking.findById(bookingId).populate({
      path:'show',
      populate:{path: "movie",model:" Movie"}
    }).populate('user');

    await sendEmail({
      to:booking.user.email,
      subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
      body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <h2>Hi ${booking.user.name},</h2>
  <p>
    Your booking for 
    <strong style="color: #F84565;">
      ${booking.show.movie.title}
    </strong> 
    is confirmed.
  </p>

  <p>
    <strong>Date:</strong> 
    ${new Date(booking.show.showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
    <br>
    <strong>Time:</strong> 
    ${new Date(booking.show.showDateTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}
  </p>

  <p>Enjoy the show! 🍿</p>
  <p>Thanks for booking with us!<br/>— QuickShow Team</p>
</div>`
    })
  }

)

export const functions=[syncUserCreation,syncUserDeletion,syncUserUpdation,releaseSeatsAndDeletebooking,sendBookingConfirmationEmail];
