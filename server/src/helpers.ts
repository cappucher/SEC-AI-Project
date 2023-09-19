import * as dotenv from "dotenv";
import turndown from "turndown";
import * as fs from "fs/promises";
import TurndownService from "turndown";


dotenv.config({ path: ".env.local" });

/**
 * Takes an html file, converts it to markdown and writes it to a new file.
 * @param inputFile The name of the file to be inputted
 * @param outputFile The name of the file that will be outputed
 */
async function convertHtmlToMarkdown(
    inputFile: string,
    outputFile: string
): Promise<void> {
    const html: string = await fs.readFile("text/" + inputFile, "utf-8");
    const turndownService: TurndownService = new turndown();
    const markdown = turndownService.turndown(html);
    await fs.writeFile(
        "text/" + outputFile,
        markdown.split("\n").slice(6).join("\n"),
        "utf-8"
    );
    console.log(`Markdown saved to ${outputFile}`);
}

/**
 * Takes an input file, and breaks it up into chunks of a constant size.
 * @param file the name of the file the user wants to split up
 * @param sizeOfChunks how big the user wants each chunk to be
 * @returns an array of all chunks
 */
async function returnChunks(
    file: string,
    sizeOfChunks: number = 1000
): Promise<string[]> {
    const markdown = await fs.readFile("text/" + file, "utf-8");
    const entries: string[] = [];
    let string = markdown.substring(0, sizeOfChunks);
    let i = 0;
    while (string.length > 0) {
        entries.push(string);
        i++;
        string = markdown.substring(i * sizeOfChunks, (i + 1) * sizeOfChunks);
    }
    return entries;
}

/**
 * Takes a ticker as input, scans a JSON file for the corresponding output, and returns the CIK. Returns undefined if the ticker is not recognized.
 * 
 * @param ticker the name of the ticker the user wants to get the CIK from
 * @returns The CIK, or undefined if not found
 */
async function getCIKFromTicker(ticker: string): Promise<string | undefined> {
    const tickers = JSON.parse(await fs.readFile("text/ticker.json", "utf-8"));

    if (tickers[ticker.toLowerCase()]) {
        return tickers[ticker.toLowerCase()].padStart(10, "0");
    }
    return undefined;
}

/**
 * A function to get the HTML of the latest 10K report based off of the ticker.
 * @param ticker The ticker to get the HTML from
 * @param writeToFile defaults to false, if true will write to file
 * @returns a string with the html, or undefined if the ticker was unrecognized
 */
async function getHTMLFromTicker(
    ticker: string,
    writeToFile = false
): Promise<string | undefined> {
    const cik: string | undefined = await getCIKFromTicker(ticker);
    console.log(`CIK: ${cik}`);
    if ((typeof cik) === "undefined") {
        return undefined;
    }
    const data = {
        "query": `${ticker.toLowerCase()}`,
        "formTypes": [
          "10-K"
        ],
        "ciks": [cik],
        "startDate": "2022-12-31",
        "endDate": "2023-04-30"
    }
    console.log(data);
    const response: Response = await fetch(`https://api.sec-api.io/full-text-search?token=${process.env.SEC_API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    const json10K = await response.json();
    console.log(json10K);
    const url10k = json10K.filings[1].filingUrl;
    
    console.log(
        `URL: ${url10k}`
    );
    const htmlresponse = await fetch(url10k);
    const html = await htmlresponse.text();
    if (writeToFile) {
        try {
            await fs.mkdir(`text/${ticker.toLowerCase()}`);
            await fs.writeFile(`text/${ticker.toLowerCase()}/${ticker.toLowerCase()}.html`, html, "utf-8");
            await convertHtmlToMarkdown(`${ticker.toLowerCase()}/${ticker.toLowerCase()}.html`, `${ticker.toLowerCase()}/${ticker.toLowerCase()}.md`);
        } catch {
            await fs.writeFile(`text/${ticker.toLowerCase()}/${ticker.toLowerCase()}.html`, html, "utf-8");
            await convertHtmlToMarkdown(`${ticker.toLowerCase()}/${ticker.toLowerCase()}.html`, `${ticker.toLowerCase()}/${ticker.toLowerCase()}.md`)
        }
    }
    return html;
}


export { getHTMLFromTicker, convertHtmlToMarkdown, returnChunks };
