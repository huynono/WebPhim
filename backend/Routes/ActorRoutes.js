const express = require("express");
const multer = require("multer");
const router = express.Router();
const actorController = require("../Controller/ActorController");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("avatar"), actorController.createActor);
router.get("/", actorController.getAllActors);
router.put("/:id", upload.single("avatar"), actorController.updateActor);
router.delete("/:id", actorController.deleteActor);

module.exports = router;
