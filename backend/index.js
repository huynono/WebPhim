require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const categoryRoutes = require("./Routes/CategoryRoutes");
const genreRoutes = require("./Routes/GenresRoutes");
const actorRoutes = require("./Routes/ActorRoutes");
const movieRoutes = require("./Routes/MovieRoutes");
const adRoutes = require("./Routes/AdRoutes");
const userUploadRoutes = require("./Routes/UserRoutes");
const authRoutes = require("./Routes/AuthRoutes");
const favoriteRoutes = require("./Routes/FavoriteRoutes");
const watchHistoryRoutes = require("./Routes/WatchHistoryRoutes");
const ratingRoutes = require("./Routes/RatingRoutes");
const commentRoutes = require("./Routes/CommentRoutes");
const homeBannerRoutes = require("./Routes/HomeBannerRoutes");
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/actors", actorRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/user-uploads", userUploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/watch-history", watchHistoryRoutes);
app.use("/api", ratingRoutes);
app.use("/api", commentRoutes);
app.use("/api/home-banners", homeBannerRoutes);

app.listen(3000, () => {
  console.log("🚀 Server đang chạy trên port 3000");
  console.log("📡 API Base URL: http://localhost:3000/api");
  console.log("🎬 WebPhim Backend Server đã sẵn sàng!");
});
