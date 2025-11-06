const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getTimeContext = () => {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) return 'night';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
};

const getAdjustment = (param, time) => {
  const map = {
    temperature: {
      night: 0.2,
      morning: 0.3,
      afternoon: 0.45,
      evening: 0.3,
    },
    pulse: {
      night: 0.2,
      morning: 0.3,
      afternoon: 0.35,
      evening: 0.25,
    },
    spo2: {
      night: 0.4,
      morning: 0.4,
      afternoon: 0.35,
      evening: 0.45,
    },
    stress: {
      night: 0.1,     // ночью стресс обычно низкий
      morning: 0.4,   // утром вероятность роста стресса выше
      afternoon: 0.5,
      evening: 0.3,
    },
  };

  return map[param][time];
};

const generateValue = ({ prev, min, max, step, decimal = 0, increaseChance }) => {
  const rand = Math.random();
  let delta = 0;

  if (rand < increaseChance) delta = step;
  else if (rand < increaseChance + (1 - increaseChance) / 2) delta = -step;

  const result = clamp(prev + delta, min, max);
  return +result.toFixed(decimal);
};

const generateNextData = (lastData) => {
  const time = getTimeContext();

  const base = {
    temperature: typeof lastData?.temperature === 'number' ? lastData.temperature : 36.6,
    pulse: typeof lastData?.pulse === 'number' ? lastData.pulse : 75,
    spo2: typeof lastData?.spo2 === 'number' ? lastData.spo2 : 94,
    stress: typeof lastData?.stress === 'number' ? lastData.stress : 20, // базовый уровень стресса
  };

  return {
    temperature: generateValue({
      prev: base.temperature,
      min: 36.1,
      max: 37.2,
      step: 0.1,
      decimal: 1,
      increaseChance: getAdjustment('temperature', time),
    }),
    pulse: generateValue({
      prev: base.pulse,
      min: 65,
      max: 85,
      step: 1,
      increaseChance: getAdjustment('pulse', time),
    }),
    spo2: generateValue({
      prev: base.spo2,
      min: 92,
      max: 98,
      step: 1,
      increaseChance: getAdjustment('spo2', time),
    }),
    stress: generateValue({
      prev: base.stress,
      min: 0,
      max: 100,
      step: 2,
      increaseChance: getAdjustment('stress', time),
    }),
  };
};

app.post('/health-data', (req, res) => {
  console.log('Пришел запрос')
  const previous = req.body;
  const next = generateNextData(previous);
  res.json(next);
});

app.listen(port, () => {
  console.log(`🩺 Health server running at http://localhost:${port}`);
});
