const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

console.log('Current directory:', process.cwd());
const processDefsPath = path.join(__dirname, '..', 'processes', 'process-definitions.json');
console.log('Looking for process definitions at:', processDefsPath);

const processDefinitions = require('../processes/process-definitions.json');

function generateProcessSteps() {
    const processesWithSteps = processDefinitions.map(processDefinition => {
        const processPath = path.join(__dirname, '..', 'processes', processDefinition.id);
        console.log(`Looking for process ${processDefinition.id} at:`, processPath);

        if (!fs.existsSync(processPath)) {
            console.warn(`Warning: Process directory not found for ${processDefinition.id}`);
            return {
                ...processDefinition,
                steps: []
            };
        }

        // Read all markdown files in the process directory
        const files = fs.readdirSync(processPath)
            .filter(file => file.endsWith('.md'))
            .sort();

        const steps = files.map((file, index) => {
            const filePath = path.join(processPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContent);

            return {
                id: `${processDefinition.id}-${index + 1}`,
                title: data.title || `Step ${index + 1}`,
                description: content,
                actionItems: data.actionItems || []
            };
        });

        // Return process with its steps
        return {
            ...processDefinition,
            steps: steps
        };
    });

    // Write the generated processes to a JSON file
    const outputPath = path.join(__dirname, '..', 'src', 'generatedProcesses.json');
    fs.writeFileSync(outputPath, JSON.stringify(processesWithSteps, null, 2));
    console.log(`Generated processes file at ${outputPath}`);
}

generateProcessSteps();
