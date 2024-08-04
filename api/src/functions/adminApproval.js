const { app } = require('@azure/functions');
const { parseRequestBody }         = require('../middleware/parseRequestBody')
const { adminFindUserName }        = require('../adminFunction/adminFunctions')
const { adminCreatedGitUpdate }    = require('../adminFunction/adminFunctions')
const { processVersionApproval }   = require('../adminFunction/adminFunctions')
const { adminCheckingGitCreated }  = require('../adminFunction/adminFunctions')
const { createRepository }         = require('../process/adminProcess')

app.http('approvalFunction', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route:'admin/approval',
    handler: async (request, context) => {
        context.log('Received request:', {
            method: request.method,
            url: request.url,
            headers: request.headers
        });

        const { success, body, error } = await parseRequestBody(request, context);

        if (!success) {
            context.res = {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error })
            };
            return;
        }

        const {
            isApproval, appName,
            email, appVersion,
            readability, maintainability,
            security, performance,
            optimization, vulnerabilities,
            codeDescription, adminComments,
            rating
        } = body;

        context.log('Request body parsed:', {
            isApproval, appName,
            email, appVersion,
            readability, maintainability,
            security, performance,
            optimization, vulnerabilities,
            codeDescription, adminComments,
            rating
        });

        const analysisData = {
            readability, maintainability,
            security, performance,
            optimization, vulnerabilities,
            codeDescription, adminComments,
            Params: rating
        };

        try {
            if (!appName || !email || !appVersion) {
                context.log('Missing required parameters:', { appName, email, appVersion });
                context.res = {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ error: 'Missing required parameters' })
                };
                return;
            }

            context.log('Retrieving username for email:', email);
            let name = await adminFindUserName(email);
            let userName = name.data;

            if (isApproval) {
                context.log('Processing version approval for:', { email, appName, appVersion });
                const process = await processVersionApproval(email, appName, appVersion, isApproval, analysisData);

                

                const result = await adminCheckingGitCreated(email, appName);
                context.log('Git repository check result:', result);

                if (result.data === false) {
                    context.log('Creating new repository for app:', appName);
                    const gitResult = await createRepository(appName, userName);
                    const repoURL = gitResult.repoURL;
                    const updateResult = await adminCreatedGitUpdate({ email, appName, repoURL });

                    context.res = {
                        status: updateResult.status,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message: updateResult.message })
                    };
                    return;
                } else {
                    context.res = {
                        status: process.status,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message: process.message })
                    };
                    return;
                }
            } else {
                context.log('Processing version denial for:', { email, appName, appVersion });
                const process = await processVersionApproval(email, appName, appVersion, isApproval, analysisData);

                context.res = {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: 'Admin denied the version' })
                };
                return;
            }
        } catch (error) {
            context.log.error('Internal error:', error);
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Internal server error' })
            };
        }
    }
});