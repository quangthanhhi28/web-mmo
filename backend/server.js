const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// import routes
const apiRoutes = require("./routes/index");

const app = express();

/* =======================
   CORS (CHO NETLIFY)
======================= */
app.use(
  cors({
    origin: "*", // sau này có domain netlify thì thay bằng domain đó
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =======================
   MIDDLEWARE
======================= */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* =======================
   ROUTES
======================= */
app.use("/api", apiRoutes);

/* =======================
   HEALTH CHECK (BẮT BUỘC CHO RENDER)
======================= */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend bán tài nguyên đang chạy 🚀",
    time: new Date(),
  });
});

/* =======================
   PORT (RENDER TỰ GÁN)
======================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("=================================");
  console.log("🚀 Server đang chạy");
  console.log("👉 Port:", PORT);
  console.log("👉 Mode:", process.env.NODE_ENV || "development");
  console.log("=================================");
});
