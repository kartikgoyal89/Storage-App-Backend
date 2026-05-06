import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.DB_URL ?? "mongodb://kartik:kartik123@localhost:27017/driveApp?replicaSet=myReplicaSet");
    console.log("Connected to Database!!!");
  } catch (err) {
    console.log(err);
    console.log("Could not connect to Database");
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("Disconnecting the Database...");
  await mongoose.disconnect();
  process.exit(0);
});
