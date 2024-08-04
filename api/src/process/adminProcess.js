import { Octokit } from "@octokit/rest";
import dotenv from 'dotenv';

dotenv.config();

const octokit = new Octokit({ auth: process.env.GTFRC });

export const createRepository = async (appName, userName) => {
    try {
        const response = await octokit.request('POST /user/repos', {
            name: `${userName}-${appName}`,
            private: false,
            description: `A new repository created for ${userName}`,
            auto_init: true
        });

        const repoURL = response.data.html_url;

        console.log(`Repository "${userName}-${appName}" created successfully!`);
        console.log(`Repository URL: ${repoURL}`);

        return { status: 200, message: 'Repository created successfully', repoURL };

    } catch (error) {
        console.error('Error creating repository:', error.message || error);
        throw error;
    }
};
