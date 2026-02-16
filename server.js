const mongoose = require("mongoose");
const dotenv = require("dotenv");
const monitorMemory = require('./utils/memoryMonitor');
dotenv.config({ path: "./config.env" });

const app = require("./index");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB)
  .then(() => console.log("DB connection successful! Quran DB is ready"));
// mongoose.connect("mongodb://127.0.0.1:27017/quran_app").then(()=>console.log("Connected to MongoDB")).catch(err => console.error("Error:",err))


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
  monitorMemory();
});
