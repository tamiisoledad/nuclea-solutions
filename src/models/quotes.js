import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ConsultationSchema = new Schema({
  text: {type: String, required: true},
  consultation_date: {type: String, required: true}
})

const AuthorSchema = new Schema({
  author: { type: String, required: true},
  consultations: [ConsultationSchema]
})

const AuthorModel = mongoose.model('Author', AuthorSchema);

export default AuthorModel;
