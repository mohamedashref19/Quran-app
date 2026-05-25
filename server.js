const mongoose = require("mongoose");
const dotenv = require("dotenv");
const monitorMemory = require("./utils/memoryMonitor");
const Setting = require("./models/settingModel");
// dotenv.config({ path: "./config.env" });
dotenv.config({ path: "./.env" });

const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD,
);

const initializeSettings = async () => {
  try {
    const count = await Setting.countDocuments();
    if (count === 0) {
      await Setting.create({ hijriOffset: 0 });
      console.log(
        "📌The default settings log was successfully created (Hijri Offset = 0)",
      );
    }
  } catch (err) {
    console.error("Error in setting up:", err);
  }
};
mongoose
  .connect(DB)
  .then(() => console.log("DB connection successful! Quran DB is ready"))
  .catch((err) => console.error("DB Connection Error:", err));
// mongoose.connect("mongodb://127.0.0.1:27017/quran_app").then(()=>console.log("Connected to MongoDB")).catch(err => console.error("Error:",err))

initializeSettings();

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`App running on port ${port}...`);
  // monitorMemory();
});
