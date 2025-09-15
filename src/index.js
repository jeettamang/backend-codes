import dotenv from "dotenv";
import connectionDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config();
const PORT = +process.env.PORT || 8888;
connectionDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port : ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Database connection failed", err);
  });
