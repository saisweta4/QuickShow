import {Inngest} from "inngest";
import User from "../models/user.js";
import connectDB from "../configs/db.js"; 

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

export const functions=[syncUserCreation,syncUserDeletion,syncUserUpdation];
