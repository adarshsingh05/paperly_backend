import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  feedback: { 
    type: String, 
    required: true,
    trim: true
  },
  star: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
