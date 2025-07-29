import mongoose from "mongoose";

const promptSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export default mongoose.model("Prompt", promptSchema);
