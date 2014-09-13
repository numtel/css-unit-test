# [SteezTest.me CSS Unit Testing](http://steeztest.me/)

Use the application without local installation at http://steeztest.me/

### Installation

1. Install Meteor: https://www.meteor.com/
2. Run `meteor` from application directory
3. Browse to `http://localhost:3000/` (or chosen port)

### Running Source Code Tests

On Ubunbtu and Debian systems, from application root directory, run script: 

    ./private/tests/main.js

On others that don't use `nodejs` instead of `node`:

    node ./private/tests/main

On first test run, the Fibers module used may need to be updated to your configuration.
If you see an error like this:

    Error: `/home/ben/meteor/css-test/private/tests/node_modules/fibers/bin/linux-x64-v8-3.14/fibers.node` is missing. Try reinstalling `node-fibers`?

You should be able to run the following commands to fix this: (change the directory from `linux-x64-v8-3.14` to match your error)

    cd private/tests/node_modules/fibers
    node-gyp rebuild
    mkdir bin/linux-x64-v8-3.14
    cp build/Release/fibers.node bin/linux-x64-v8-3.14/ 


