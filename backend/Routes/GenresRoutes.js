const express = require("express");
const {
  getGenres,
  createGenre,
  updateGenre,
  deleteGenre,
} = require("../Controller/GenresController"); // tên trùng khớp 100%

const router = express.Router();

router.get("/", getGenres);
router.post("/", createGenre);
router.put("/:id", updateGenre);
router.delete("/:id", deleteGenre);

module.exports = router;
