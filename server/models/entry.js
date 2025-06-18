import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema({
  content: { type: String, required: true },
  mood: { type: String },
  trigger: { type: String },
  response: { type: String },
  date: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Entry = mongoose.model('Entry', entrySchema);
export default Entry;
