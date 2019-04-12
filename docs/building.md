## Building from source

Ensure you have Node.js 8 (or newer) and Git installed

    node --version
    git --version
    
First clone the Node.js adapter repository:
    
    git clone https://github.com/keycloak/keycloak-nodejs-connect.git
    cd keycloak-nodejs-connect
    
To build Node.js adapter run:

    npm install
    
This will install the adapter, and any packages that it depends on. 

## Working with the codebase

We don't currently enforce a code style in Node.js adapter, because Node.js already have tools to ensure that code is properly formatted. Before submitting any pull request, please run:

    make lint

If your changes require introducing new dependencies or updating dependency versions please discuss this first on the
dev mailing list. We do not accept new dependencies to be added lightly, so try to use what is available.
