import mongoose from "mongoose";

const AlphaSchema = new mongoose.Schema({}, {strict: false});

const AlphaModel = mongoose.model('AlphaModel', AlphaSchema);

export default AlphaModel;
