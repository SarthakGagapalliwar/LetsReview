import {Pinecone} from "@pinecone-database/pinecone"

export const pinecone = new Pinecone({
    apiKey:process.env.PINECONE_DB_API_KEY!
})
export const pineconeIndex = pinecone.index("letsreview-new")

