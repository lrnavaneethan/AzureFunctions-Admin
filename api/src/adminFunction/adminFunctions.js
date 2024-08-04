
const { container } = require('../config/cosmoClient');




async function processVersionApproval(email, appName, appVersion, isApproval, analysisData) {
    try {
        
        if (!container || !container.items) {
            return { status: 500, message: 'Database container is not initialized' };
        }   
        const { resources: developers } = await container.items
            .query({ query: "SELECT * FROM c WHERE LOWER(c.email) = LOWER(@Email)", parameters: [{ name: "@Email", value: email }] })
            .fetchAll();

        if (developers.length === 0) {
            return { status: 409, message: 'Developer not found' };
        }

        const developer = developers[0];
        const app = developer.userapp.find(app => app.appName.toLowerCase() === appName.toLowerCase());

        if (!app) {
            return { status: 409, message: 'App not found' };
        }

        const verIndex = app.version.findIndex(ver => ver.appVersion === appVersion);

        if (verIndex === -1) {
            return { status: 409, message: 'Version not found' };
        }

        // Push analysis data to version feedback
        app.version[verIndex].versionFeedback.push(analysisData);

        if(app.adminApproval === false){

          app.adminApproval = isApproval;
        };

        const versionToUpdate = app.version[verIndex]; 

        if (!versionToUpdate) {
            return { status: 409, message: 'Version not found for the provided appName and version' };
        }

        versionToUpdate.adminVersionApproval = isApproval;
        versionToUpdate.status = isApproval ? "accepted" : "denied";
        versionToUpdate.approvedStatus = isApproval ? "accepted" : "denied";

        // Update the userapp array with the modified app
        developer.userapp = developer.userapp.map(appItem => 
            appItem.app_id === app.app_id ? app : appItem
        );

        // Attempt to update the developer document in the database
        const { resource: updatedDeveloper } = await container.items.upsert(developer);

        if (!updatedDeveloper) {
            return { status: 500, message: 'Failed to update developer information' };
        }

        return { status: 200, message: 'Analysis data and admin approval updated successfully' };

    } catch (error) {
        console.error('Failed to process version approval:', error.message || error);
        return { status: 500, message: 'Internal server error' };
    }
}




const adminCheckingGitCreated = async (email, appName) => {
    try {
      
  if (!container || !container.items) {
            return { status: 500, message: 'Database container is not initialized' };
        }

    const { resources: developers } = await container.items
        .query({ query: "SELECT * FROM c WHERE LOWER(c.email) = LOWER(@Email)", parameters: [{ name: "@Email", value: email }] })
        .fetchAll();

    if (developers.length === 0) {
        return { status: 409, message: 'Developer not found' };
    }

    const developer = developers[0];
    
    const app = developer.userapp.find(app => app.appName.toLowerCase() === appName.toLowerCase());

    if (!app) {
        return { status: 409, message: 'App not found' };
    }       
        return { status: 200, data: app.gitHubCreated };

    } catch (error) {
        console.error("Error checking GitHub created status:", error.message || error);
        return { status: 500, message: "Internal server error" };
    }
};



const adminCreatedGitUpdate = async ({ email, appName, repoURL }) => {
    try {
        
         if (!container || !container.items) {
            return { status: 500, message: 'Database container is not initialized' };
        }
        
        const { resources: developers } = await container.items
        .query({ query: "SELECT * FROM c WHERE LOWER(c.email) = LOWER(@Email)", parameters: [{ name: "@Email", value: email }] })
        .fetchAll();

    if (developers.length === 0) {
        return { status: 409, message: 'Developer not found' };
    }

    const developer = developers[0];
    
    const app = developer.userapp.find(app => app.appName.toLowerCase() === appName.toLowerCase());

    if (!app) {
        return { status: 409, message: 'App not found' };
    }

        app.adminCreatedGit = repoURL;
        app.gitHubCreated = true;
  
        const { resource: updatedDeveloper } = await container.items.upsert(developer);

        if (!updatedDeveloper) {
            return { status: 500, message: 'Failed to update developer information' };
        }
        console.log('User updated successfully:'); 
  
        return { status: 200, message: 'Admin approved and created a GitHub account' };
  
    } catch (error) {
        console.error("Error updating GitHub account:", error);
        return { status: 500, message: "Internal server error" };
    }
};


  
const adminFindUserName = async (email) => {
    try {
        if (!container || !container.items) {
            return { status: 500, message: 'Database container is not initialized' };
        }

        const query = "SELECT * FROM c WHERE LOWER(c.email) = LOWER(@Email)";
        const parameters = [{ name: "@Email", value: email }];
        const { resources: developers } = await container.items.query({ query, parameters }).fetchAll();

        if (developers.length === 0) {
            return { status: 409, message: 'Developer not found' };
        }
 
        return { status: 200, data: developers[0].userName };
  
    } catch (error) {
        console.error("Error finding user:", error);
        return { status: 500, message: "Internal server error" };
    }
};

  

const getRequestsCount = async () => {
    try {
        const query = `SELECT * FROM c`;
        const { resources: users } = await container.items.query(query).fetchAll();
  
        if (users.length === 0) {
            return { status: 409, data: "No app details found" };
        }
  
        let Accepted = 0;
        let Denied = 0;
        let Pending = 0;
  
        users.forEach(user => {
            if (user.userapp && Array.isArray(user.userapp)) {
                user.userapp.forEach(app => {
                    if (app.version && Array.isArray(app.version)) {
                        app.version.forEach(appVersion => {
                            if (appVersion.approvedStatus === "accepted") {
                                Accepted++;
                            } else if (appVersion.approvedStatus === "denied") {
                                Denied++;
                            } else if (appVersion.approvedStatus === "pending") {
                                Pending++;
                            }
                        });
                    }
                });
            }
        });
  
        const result = { Accepted, Denied, Pending };
        return { status: 200, data: result };
  
    } catch (error) {
        console.error("Error fetching requests:", error);
        return { status: 500, data: "Internal Server Error" };
    }
};



const getAllAppsByStatus = async (status) => {
    try {
      
      const query = `SELECT * FROM c`;
      const { resources: users } = await container.items.query(query).fetchAll();
  
      let allApps = [];
  
      for (let user of users) {
        // Ensure user.userapp is an array
        if (!Array.isArray(user.userapp)) continue;
  
        let filteredApps = user.userapp
          .filter(app => {
            // Ensure app.version is an array
            if (!Array.isArray(app.version)) return false;
  
            if (status === 'inprogress') {
              return app.version.some(ver => ver.approvedStatus === 'pending');
            } else if (status === 'accepted') {
              return app.version.some(ver => ver.approvedStatus === 'accepted');
            } else if (status === 'denied') {
              return app.version.some(ver => ver.approvedStatus === 'denied');
            }
            return false;
          })
          .flatMap(app =>
            app.version
              .filter(ver => {
                if (status === 'inprogress') {
                  return ver.approvedStatus === 'pending' && ver.appVersion !== '0.0.0';
                } else if (status === 'accepted') {
                  return ver.approvedStatus === 'accepted' && ver.appVersion !== '0.0.0';
                } else if (status === 'denied') {
                  return ver.approvedStatus === 'denied' && ver.appVersion !== '0.0.0';
                }
                return false;
              })
              .map(ver => ({
                appName:        app.appName ,
                status:         app.status ,
                createdGit:     app.gitHubCreated ,
                adminCreatedGit:app.adminCreatedGit || "",
                deployInAzure:  app.adminDeployInAzure || false,
                updatedVersion: ver.appVersion ,
                versionStatus:  ver.status ,
                gitHubLink:     ver.gitHubLink ,
                dockerHubLink:  ver.dockerHubLink ,
               
                updatedOn: ver.updatedOn || new Date().toISOString(),
              }))
          );
  
        if (filteredApps.length > 0) {
          allApps.push({
            email:         user.email ,
            userName:      user.userName,
            developerApps: filteredApps,
          });
        }
      }
  
      let message = '';
      if (status === 'inprogress') {
        message = 'In-progress apps retrieved successfully';
      } else if (status === 'accepted') {
        message = 'Accepted apps retrieved successfully';
      } else if (status === 'denied') {
        message = 'Denied apps retrieved successfully';
      }
  
      return { status: 200, message, data: allApps };
    } catch (error) {
      console.error(`Error retrieving ${status} apps:`, error);
      return { status: 500, message: 'Internal server error' };
    }
};
  
  
const adminAzureDeployment = async ({ email, appName, staticWebAppURL ,functionAppURL,
                                      gitHubActions, appType, location,resourceGroup, subscription}) => {
    try {
     
        const { resources: developers } = await container.items
       .query({ query: "SELECT * FROM c WHERE LOWER(c.email) = LOWER(@Email)", parameters: [{ name: "@Email", value: email }] })
       .fetchAll();

      if (developers.length === 0) {
               return { status: 409, message: 'Developer not found' };
        }

        const developer = developers[0];
        
        const app       = developer.userapp.find(app => app.appName.toLowerCase() === appName.toLowerCase());

        if (!app) {
              return { status: 409, message: 'App not found' };
          }
 
      app.staticWebAppURL = staticWebAppURL;
      app.functionAppURL  = functionAppURL;
      app.gitHubActions   = gitHubActions;
      app.adminDeployInAzure = true;
      app.appType        = appType || "";
      app.location       = location;
      app.resourceGroup  = resourceGroup;
      app.subscription   = subscription || "";
  
      await container.items.upsert(developer);
      return { status: 200, message: 'Successfully updated' };
  
    } catch (error) {
      console.error("Error updating Azure deployment:", error);
      return { status: 500, message: 'Internal server error' };
    }
};
  



const adminFetchUsers = async () => {
    try {
      const query = `SELECT c.userName, c.email, c.age, c.gender FROM c`;
      const { resources: developers } = await container.items.query(query).fetchAll();
  
      if (!developers || developers.length === 0) {
        return { status: 404, message: 'No developers found' };
      }
  
      return { status: 200, data: developers };
    } catch (error) {
      console.error('Error fetching developers:', error);
      return { status: 500, message: 'Internal server error' };
    }
};



 
const adminFetchUserDetails = async (email) => {
    try {
     
      const query = {
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }]
      };
  
      // Execute the query
      const { resources: [developer] } = await container.items.query(query).fetchAll();
  
      
      if (!developer) {
        return { status: 409, message: 'User not found' };
      }
  
     
      const userApps = developer.userapp.flatMap(app => {
       
        if (!Array.isArray(app.version)) {
          console.log(`App ${app.appName} does not have versions array`);
          return [];
        }
  
      
        return app.version.map(ver => ({
          appLogo:              app.appLogo,
          gitHubActions:        app.gitHubActions,
          _id:                  app._id,
          appName:              app.appName,
          appSize:              app.size,
          appDescription:       app.appDescription,
          shortDescription:     app.shortDescription,
          category:             app.category,
          keyWords:             app.keyWords,
          adminApproval:        app.adminApproval,
          adminDeployInAzure:   app.adminDeployInAzure,
          functionAppURl:       app.functionAppURl,
          staticWebAppURL:      app.staticWebAppURL,
          adminDeployInWebsite: app.adminDeployInWebsite,
          gitHubCreated:        app.gitHubCreated,
          adminCreatedGit:      app.adminCreatedGit,
          updatedVersion:       ver.appVersion,
          applicationStatus:    ver.status,
          adminVersionApproval: ver.adminVersionApproval,
          gitHubLink:           ver.gitHubLink,
          dockerHubLink:        ver.dockerHubLink,
          versionDescription:   ver.versionDescription,
          updatedOn:            ver.updatedOn,
          versionFeedback:      ver.versionFeedback,
          createdAt:            app.createdAt,
          icon:                 app.icon,
          appImg:               app.appImg,
        }));
      });
  
      // Return the user applications
      return { status: 200, data: userApps };
    } catch (error) {
      console.error('Error fetching user details:', error);
      return { status: 500, message: 'Internal server error' };
    }
};
  


  
  
//for displaying the content to the deploy centre.
const getDeploymentDisplay = async () => {
    try {
      const query = `SELECT * FROM c WHERE ARRAY_LENGTH(c.userapp) > 0`;
      const { resources: users } = await container.items.query(query).fetchAll();
  
      let result = [];
  
      users.forEach(user => {
        user.userapp.forEach(app => {
          if (app.adminDeployInAzure) {
             
            const filteredVersions = app.version.filter(ver => ver.adminVersionApproval === true && ver.adminDeployInWebsite === false || true);
             
            if (filteredVersions.length > 0) {
              const simplifiedVersions = filteredVersions.map(ver => ({
                appVersion: ver.appVersion,
              }));
  
              const simplifiedApp = {
                appName:         app.appName,
                appType:         app.appType,
                location:        app.location || "",
                resourceGroup:   app.resourceGroup || "",
                functionAppURL:  app.functionAppURL,
                staticWebAppURL: app.staticWebAppURL,
                //version:         simplifiedVersions,
                appLogo:         app.appLogo
              };
  
              result.push({
                appID:           app.app_id,
                userName:        user.userName,
                email:           user.email,
                appName:         app.appName,
                appType:         app.appType,
                location:        app.location || "",
                resourceGroup:   app.resourceGroup || "",
                functionAppURL:  app.functionAppURL || "",
                staticWebAppURL: app.staticWebAppURL || "",
                //version:       simplifiedVersions,
                appLogo:         app.appLogo
              });
            }
          }
        });
      });
  
      
  
      return { status: 200, data: result };
  
    } catch (error) {
      console.error('Error fetching deployment details:', error);
      return { status: 500, message: 'Internal server error' };
    }
};
  


  
//to making the deployInWebsite to true.
const adminUpdateDeployment = async (email, appName, appVersion) => {
    try {
      // Query to find the developer by email
      const { resources: developers } = await container.items
        .query({ 
          query: "SELECT * FROM c WHERE LOWER(c.email) = LOWER(@Email)", 
          parameters: [{ name: "@Email", value: email }] 
        })
        .fetchAll();
  
      console.log("Developers found:", developers); // Debugging log
  
      if (developers.length === 0) {
        return { status: 409, message: 'Developer not found' };
      }
  
      const developer = developers[0];
      
      const app = developer.userapp.find(app => app.appName.toLowerCase() === appName.toLowerCase());
  
      if (!app) {
        return { status: 409, message: 'App not found' };
      }
  
      const versionIndex = app.version.findIndex(ver => ver.appVersion === appVersion);
  
      if (versionIndex === -1) {
        return { status: 409, message: 'Version not found' };
      }
  
      // Update the deployment status for the specified version
      app.version[versionIndex].adminDeployInWebsite = true;
  
      // Update the developer record in the database
      await container.items.upsert(developer);
  
      return { status: 200, message: 'Deployment status updated successfully' };
  
    } catch (error) {

      console.error('Error updating deployment status:', error);
      return { status: 500, message: 'Internal server error' };
    }
};



//for filtering with app type
const filterAppType = async (appType) => {
  try {
   
    const query = `SELECT * FROM c`;
    const { resources: users } = await container.items.query(query).fetchAll();

    let filteredApps = [];

    for (let user of users) {
     
      if (!Array.isArray(user.userapp)) continue;

     
      let userFilteredApps = user.userapp
        .filter(app => app.appType === appType)
        .map(app => ({
          app_id:   app.app_id,
          appName:  app.appName,
          appType:  app.appType,
          size:     app.size,
       // adminApproval:     app.adminApproval,
          functionAppURL:   app.functionAppURL,
          staticWebAppURL:  app.staticWebAppURL,
       // gitHubCreated:    app.gitHubCreated,
          adminCreatedGit:  app.adminCreatedGit,
          category:         app.category,
          keywords:         app.keywords,
          appDescription:   app.appDescription,
          shortDescription: app.shortDescription,
          createdAt:        app.createdAt,
          appLogo:          app.appLogo,
          gitHubActions:    app.gitHubActions,
          location:         app.location,
          resourceGroup:    app.resourceGroup,
          subscription:     app.subscription,
          versions: app.version.map(ver => ({
            id:                   ver.id,
            appVersion:           ver.appVersion,
            gitHubLink:           ver.gitHubLink,
            dockerHubLink:        ver.dockerHubLink,
            versionDescription:   ver.versionDescription,
         // approvedStatus:       ver.approvedStatus,
            status:               ver.status,
            adminVersionApproval: ver.adminVersionApproval,
            adminDeployInWebsite: ver.adminDeployInWebsite,
            updatedOn:            ver.updatedOn,
            versionFeedback:      ver.versionFeedback,
          })),
        
        }));

      if (userFilteredApps.length > 0) {
        filteredApps.push({
          email:    user.email ,
          userName: user.userName ,
          apps:     userFilteredApps,
        });
      }
    }

    if (filteredApps.length === 0) {
      return { status: 409, message: 'No applications found for the provided app type' };
    }

    return { status: 200, message: 'Applications retrieved successfully', data: filteredApps };
  } catch (error) {
    console.error('Error fetching applications by type:', error);
    return { status: 500, message: 'Internal server error' };
  }
}



const fetchAppDetails = async (email, appName) => {
  try {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: email }]
    };

    const { resources: users } = await container.items.query(querySpec).fetchAll();
    if (users.length === 0) {
      return { status: 409, message: 'User not found' };
    }

    
    const user = users[0];
    const app = user.userapp.find(app => app.appName.toLowerCase() === appName.toLowerCase());
    if (!app) {
      return { status: 409, message: 'App not found' };
    }

    // Find the latest version that meets the conditions without sorting
    const filteredVersions = app.version.filter(v => (v.adminVersionApproval && !v.adminDeployInWebsite) || v.adminDeployInWebsite);
    const latestApprovedVersion = filteredVersions.length > 0 ? filteredVersions[filteredVersions.length - 1] : null;

    if (!latestApprovedVersion) {
      return { status: 409, message: 'No approved version found' };
    }

    return {
      status: 200,
      data: {
          email:email,
          app_id: app.app_id,
          appName: app.appName,
          searchApp: app.searchApp,
          appType: app.appType,
          location: app.location,
          resourceGroup: app.resourceGroup,
          subscription: app.subscription,
          appSize: app.appSize,
          adminApproval: app.adminApproval,
          adminDeployInAzure: app.adminDeployInAzure,
          staticWebAppURL: app.staticWebAppURL,
          functionAppURL: app.functionAppURL,
          gitHubCreated: app.gitHubCreated,
          adminCreatedGit: app.adminCreatedGit,
          category: app.category,
          keywords: app.keywords,
          appDescription: app.appDescription,
          shortDescription: app.shortDescription,
          createdAt: app.createdAt,
          version_id: latestApprovedVersion.id,
          appVersion: latestApprovedVersion.appVersion,
          gitHubLink: latestApprovedVersion.gitHubLink,
          dockerHubLink: latestApprovedVersion.dockerHubLink,
          versionDescription: latestApprovedVersion.versionDescription,
          approvedStatus: latestApprovedVersion.approvedStatus,
          status: latestApprovedVersion.status,
          adminVersionApproval: latestApprovedVersion.adminVersionApproval,
          adminDeployInWebsite: latestApprovedVersion.adminDeployInWebsite,
          updatedOn: latestApprovedVersion.updatedOn,
          versionFeedback: latestApprovedVersion.versionFeedback
        
      }
    };
  } catch (error) {
    console.error('Error fetching app details:', error);
    return { status: 500, message: 'Internal server error' };
  }
};





module.exports = {
    adminCheckingGitCreated,
    adminCreatedGitUpdate,
    adminFindUserName,
    getRequestsCount,
    getAllAppsByStatus,
    processVersionApproval,
    adminAzureDeployment,
    adminFetchUsers,
    adminFetchUserDetails,
    getDeploymentDisplay,
    adminUpdateDeployment,
    filterAppType,
    fetchAppDetails
  
};