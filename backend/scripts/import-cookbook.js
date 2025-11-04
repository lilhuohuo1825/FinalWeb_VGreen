const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { MONGODB_URI } = require("../config/database");
const { Dish, Instruction } = require("../db");

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    // console.log(" Connected to MongoDB");

    // Try to find JSON files
    const possiblePaths = {
      instructions: [
        path.join(
          __dirname,
          "../../my-user/public/data/cookbook/instructions.json"
        ),
        path.join(
          __dirname,
          "../../my-user/src/assets/data/cookbook/instructions.json"
        ),
        path.join(__dirname, "../data/cookbook/instructions.json"),
        path.join(__dirname, "../../data/cookbook/instructions.json"),
      ],
      dishes: [
        path.join(__dirname, "../../my-user/public/data/cookbook/dishes.json"),
        path.join(
          __dirname,
          "../../my-user/src/assets/data/cookbook/dishes.json"
        ),
        path.join(__dirname, "../data/cookbook/dishes.json"),
        path.join(__dirname, "../../data/cookbook/dishes.json"),
      ],
    };

    let instructionsData = null;
    let dishesData = null;
    let instructionsPath = null;
    let dishesPath = null;

    // Find instructions.json
    for (const filePath of possiblePaths.instructions) {
      if (fs.existsSync(filePath)) {
        instructionsPath = filePath;
        // console.log(` Found instructions.json at: ${filePath}`);
        try {
          const fileContent = fs.readFileSync(filePath, "utf8");
          instructionsData = JSON.parse(fileContent);
          // console.log(
          //     ` Loaded ${instructionsData.length} instructions from JSON`
          //   );
        } catch (error) {
          // console.error(` Error reading instructions.json: ${error.message}`);
          process.exit(1);
        }
        break;
      }
    }

    // Find dish.json
    for (const filePath of possiblePaths.dishes) {
      if (fs.existsSync(filePath)) {
        dishesPath = filePath;
        // console.log(` Found dish.json at: ${filePath}`);
        try {
          const fileContent = fs.readFileSync(filePath, "utf8");
          dishesData = JSON.parse(fileContent);
          // console.log(` Loaded ${dishesData.length} dishes from JSON`);
        } catch (error) {
          // console.error(` Error reading dish.json: ${error.message}`);
          process.exit(1);
        }
        break;
      }
    }

    if (!instructionsData) {
      // console.error(" Could not find instructions.json file!");
      // console.log(" Searched in:");
      // possiblePaths.instructions.forEach((p) => console.log(`   - ${p}`));
      process.exit(1);
    }

    if (!dishesData) {
      // console.error(" Could not find dish.json file!");
      // console.log(" Searched in:");
      // possiblePaths.dishes.forEach((p) => console.log(`   - ${p}`));
      process.exit(1);
    }

    // Check if data already exists
    const existingInstructionsCount = await Instruction.countDocuments();
    const existingDishesCount = await Dish.countDocuments();

    if (existingInstructionsCount > 0 || existingDishesCount > 0) {
      // console.log(`\n Found existing data in database:`);
      // console.log(`   - Instructions: ${existingInstructionsCount}`);
      // console.log(`   - Dishes: ${existingDishesCount}`);
      // console.log(
      //   " To re-import, delete existing data first or use --force flag"
      // );
      process.exit(0);
    }

    // Import Instructions
    // console.log("\n Importing instructions...");
    let instructionsSuccess = 0;
    let instructionsError = 0;

    for (const instruction of instructionsData) {
      try {
        const instructionToInsert = {
          ...instruction,
          status: instruction.status || "Active",
        };

        const newInstruction = new Instruction(instructionToInsert);
        await newInstruction.save();
        instructionsSuccess++;
        if (instructionsSuccess % 100 === 0) {
          // console.log(`   Imported ${instructionsSuccess} instructions...`);
        }
      } catch (error) {
        instructionsError++;
        if (instructionsError <= 5) {
          // console.error(
          //   `   Error importing instruction "${instruction.ID}": ${error.message}`
          // );
        }
      }
    }

    // Import Dishes
    // console.log("\n Importing dishes...");
    let dishesSuccess = 0;
    let dishesError = 0;

    for (const dish of dishesData) {
      try {
        const newDish = new Dish(dish);
        await newDish.save();
        dishesSuccess++;
        if (dishesSuccess % 100 === 0) {
          // console.log(`   Imported ${dishesSuccess} dishes...`);
        }
      } catch (error) {
        dishesError++;
        if (dishesError <= 5) {
          // console.error(
          //   `   Error importing dish "${dish.ID}": ${error.message}`
          // );
        }
      }
    }

    // console.log(`\n Import Summary:`);
    // console.log(`    Instructions Success: ${instructionsSuccess}`);
    // console.log(`    Instructions Errors: ${instructionsError}`);
    // console.log(`    Dishes Success: ${dishesSuccess}`);
    // console.log(`    Dishes Errors: ${dishesError}`);
    // console.log(`    Total Instructions: ${instructionsData.length}`);
    // console.log(`    Total Dishes: ${dishesData.length}`);

    process.exit(0);
  })
  .catch((err) => {
    // console.error(" Error:", err);
    process.exit(1);
  });
