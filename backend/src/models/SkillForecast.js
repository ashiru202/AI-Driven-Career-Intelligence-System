const mongoose = require("mongoose");

const forecastPointSchema = new mongoose.Schema(
  {
    periodStart:   { type: Date, required: true },
    predictedFreq: { type: Number, required: true },
    lowerBound:    { type: Number, required: true },
    upperBound:    { type: Number, required: true },
  },
  { _id: false }
);

const skillForecastSchema = new mongoose.Schema({
  skill:           { type: String, required: true },
  marketScope:     {
    type: String,
    enum: ["combined", "global", "local-lk"],
    default: "combined",
  },
  generatedAt:     { type: Date, default: Date.now },
  trendDirection:  {
    type: String,
    enum: ["rising", "falling", "stable"],
    required: true,
  },
  trendSlope:      { type: Number, required: true },
  trendConfidence: { type: Number, required: true, min: 0, max: 1 },
  forecastPoints:  [forecastPointSchema],
  dataPointsUsed:  { type: Number, required: true },
  modelUsed:       {
    type: String,
    enum: ["linear", "prophet"],
    default: "linear",
  },
});

skillForecastSchema.index({ skill: 1, marketScope: 1 }, { unique: true });
skillForecastSchema.index({ marketScope: 1, trendDirection: 1, trendSlope: -1 });
skillForecastSchema.index({ generatedAt: -1 });

module.exports = mongoose.model("SkillForecast", skillForecastSchema, "skill_forecasts");
