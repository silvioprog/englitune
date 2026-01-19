import { type Plugin } from "vite";
import { apiUrls, audioUrls, type Environment } from "../env.config";

const env = (): Plugin => ({
  name: "env",
  config(_config, { mode }) {
    const env = mode as Environment;
    process.env.VITE_API_URL = process.env.VITE_API_URL ?? apiUrls[env];
    process.env.VITE_AUDIO_URL = process.env.VITE_AUDIO_URL ?? audioUrls[env];
  }
});

export default env;
