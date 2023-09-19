import express, { Express, Request, Response } from "express";
import { getHTMLFromTicker } from "./helpers.js";
import answerQuestions from "./index.js";
import cors from "cors";

const app: Express = express();
app.use(express.json());
app.use(cors());

app.post("/api/trainData/:ticker", async (req: Request, res: Response) => {
    let response: string | undefined = await getHTMLFromTicker(
        req.params.ticker,
        true
    );
    if (response == undefined) {
        res.send("Ticker not recognized.");
    } else {
        await answerQuestions(
            `${req.params.ticker}/${req.params.ticker}.md`,
            req.body.question,
            req.body.history,
            req.body.train
        );
        res.send("200 OK");
    }
});

app.post("/api/getMessage", async (req: Request, res: Response) => {
    const response: string | undefined = await answerQuestions(
        "",
        req.body.question,
        req.body.history,
        false
    );
    if (response === "" || response === undefined) {
        res.send("I don't know.");
    } else {
        res.send(response);
    }
});

app.listen(9090);
