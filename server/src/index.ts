import { PineconeClient } from "@pinecone-database/pinecone";
import * as dotenv from "dotenv";
import { VectorDBQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { Document } from "langchain/document";
import { returnChunks } from "./helpers.js";
// import { BaseLLMParams } from "langchain/dist/llms/base.js";

class CustomOpenAI extends OpenAI {
    apiEndpoint: string;
    constructor(apiKey: any, modelVersion = "gpt-3.5") {
        super(apiKey);
        this.apiEndpoint = `https://api.openai.com/v1/engines/${modelVersion}/completions`;
    }
}

dotenv.config({ path: ".env.local" });

async function trainData(file: string): Promise<void> {
    try {
        const client = new PineconeClient();
        await client.init({
            apiKey: process.env.PINECONE_API_KEY!,
            environment: process.env.PINECONE_ENVIRONMENT!,
        });
        const pineconeIndex = client.Index(process.env.PINECONE_INDEX!);
        const chunks = await returnChunks(file, 1500);

        const docs: Document[] = [];
        for (let i = 0; i < chunks.length; i++) {
            const newDocument = new Document({
                pageContent: chunks[i],
            });
            docs.push(newDocument);
        }

        await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {
            pineconeIndex,
        });
        console.log("Training successful.");
    } catch (err) {
        console.error("Error during training:", err);
    }
}

async function answerQuestions(
    file: string,
    questions: string,
    history: string,
    train = false
): Promise<string | undefined> {
    try {
        if (train) {
            console.log(file.length);
            await trainData(file);
        }
        const client = new PineconeClient();
        await client.init({
            apiKey: process.env.PINECONE_API_KEY!,
            environment: process.env.PINECONE_ENVIRONMENT!,
        });
        const pineconeIndex = client.Index(process.env.PINECONE_INDEX!);

        const vectorStore = await PineconeStore.fromExistingIndex(
            new OpenAIEmbeddings(),
            { pineconeIndex }
        );

        const model = new CustomOpenAI(process.env.OPENAI_API_KEY!, "gpt-4");
        const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
            k: 7,
            returnSourceDocuments: true,
        });
        const question = `Here are questions that I previously asked, and your answers. Your answers are prefixed with "A: ", and my questions with "Q: ". Please read them for context: ${history}\nHere is my question right now that I want you to answer: ${questions}`
        const response = await chain.call({ query: question });
        console.log("Finished answering questions");
        console.log(response);
        return response.text;
    } catch (err) {
        console.error("Error during answering questions:", err);
        return undefined;
    }
}

export default answerQuestions;
