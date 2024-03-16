import * as dotenv from "dotenv";
import {default as path} from "path";

// 1. Configure dotenv to read from our `.env` file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 2. Define a TS Type to type the returned envs from our function below.
export type ConfigProps = {
  USERPOOL_ID: string;
  CLIENT_ID: string;
};

// 3. Define a function to retrieve our env variables
export const getConfig = (): ConfigProps => ({
  USERPOOL_ID: process.env.USERPOOL_ID || "",
  CLIENT_ID: process.env.CLIENT_ID || "",
});