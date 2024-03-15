printcounter = 0;

const northDistances = [
    { actual: 528, measured: 992.90 },
];

const southDistances = [
    { actual: 1600, measured: 2170.18 },
];

function calculateCorrectionFactor(learningRate, iterations, distances) {
  let correctionFactor = 1; // Start with no correction

  for (let i = 0; i < iterations; i++) {
    let totalError = 0;

    // Calculate total error for current correction factor
    distances.forEach((pair) => {
      const correctedMeasurement = pair.measured * correctionFactor;
      const error = correctedMeasurement - pair.actual;
      totalError += error;
    });

    // Calculate average error
    const avgError = totalError / distances.length;

    // Adjust correction factor based on average error
    // Decrease correction factor if overestimating; increase if underestimating
    correctionFactor -= learningRate * avgError;
    if (printcounter == 500) {
        console.log(correctionFactor);
        printcounter = 0;
    } else if (i == 1) {
        console.log(correctionFactor);
    }
    printcounter++;
  }

  console.log("Optimized Correction Factor:", correctionFactor);
}

calculateCorrectionFactor(0.0001, 1500, northDistances);
calculateCorrectionFactor(0.0001, 1500, southDistances);