import express from "express";
import { pageObjectModelGeneratorRouter } from "./src/routes/show";
const app = express();


app.use(express.json());

app.use(pageObjectModelGeneratorRouter);

app.listen(3000, () => console.log("Running on port 3000"));
