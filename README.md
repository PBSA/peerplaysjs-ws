# Peerplays WebSocket interface (peerplaysjs-ws)

Pure JavaScript Peerplays websocket library for node.js and browsers. Can be used to easily connect to and obtain data from the Peerplays blockchain via public apis or local nodes.

Credit for the original implementation goes to [jcalfee](https://github.com/jcalfee).

[![npm version](https://img.shields.io/npm/v/peerplaysjs-ws.svg?style=flat-square)](https://www.npmjs.com/package/peerplaysjs-ws)
[![npm downloads](https://img.shields.io/npm/dm/peerplaysjs-ws.svg?style=flat-square)](https://www.npmjs.com/package/peerplaysjs-ws)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/) 
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

## Getting Started

It is recommended to use Node v8.9.x.

On Ubuntu and OSX, the easiest way to install Node is to use the [Node Version Manager](https://github.com/creationix/nvm).
For Windows users there is [NVM-Windows](https://github.com/coreybutler/nvm-windows).

To install NVM for Linux/OSX, simply copy paste the following in a terminal:

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.30.2/install.sh | bash
nvm install v8
nvm use v8
```

Once you have Node installed, you can clone the repo:

```bash
git clone https://github.com/peerplays-network/peerplaysjs-ws
cd peerplaysjs-ws
```

## Development

Initialize the application by running `npm run init`. Doing so will install commitizen globally on your environment so you can later commit via `git cz`.

### Commits

> If you have run the init script, you can commit via `git cz`.  
> If you have not run the init script, you must commit via `npm run commit`.  
> If you do neither, commit message consistency will be difficult for you.

This repository uses a combination of tools to aid in consistent commit messages. The reason we do this is so we can have dynamic changelog creation and smart semantic versioning based on commits (with the ability to override).
The following tools are used:

1. [commitizen](https://www.npmjs.com/package/commitizen)  
   Used for prompting recommended entries within a commit message to ensure it contains the necessary information.
   - [conventional changelog](https://www.npmjs.com/package/cz-conventional-changelog)  
     - Prompts for conventional changelog standard.
2. [husky](https://www.npmjs.com/package/husky)  
   By using the hooks from this package we intercept commits being made and verify them with commitlint.
   - Prevent bad commits/pushes.
3. [commitlint](https://www.npmjs.com/package/@commitlint/cli)
   - cli
   - [config-conventional](https://www.npmjs.com/package/@commitlint/config-conventional)
     - rule preset in use

## Usage

Browser bundles are provided in /build/

```
<script type="text/javascript" src="https://cdn.rawgit.com/pbsa/peerplayshs-ws/build/peerplaysjs-ws.js" />
```

A variable peerplays_ws will be available in window.

For use in a webpack/browserify context, see the example below for how to open a websocket connection to the Openledger API and subscribe to any object updates:

```
var {Apis} = require("peerplaysjs-ws");
Apis.instance("wss://bitshares.openledger.info/ws").init_promise.then((res) => {
    console.log("connected to:", res[0].network);
    Apis.instance().db_api().exec( "set_subscribe_callback", [ updateListener, true ] )
});

function updateListener(object) {
    console.log("set_subscribe_callback:\n", object);
}
```
The `set_subscribe_callback` callback (updateListener) will be called whenever an object on the blockchain changes or is removed. This is very powerful and can be used to listen to updates for specific accounts, assets or most anything else, as all state changes happen through object updates. Be aware though that you will receive quite a lot of data this way.

## Tests

The tests show several use cases, to run, simply type `npm run test`. The tests require a local witness node to be running, as well as an active internet connection.

## Releases

This repository uses a [standard version](https://www.npmjs.com/package/standard-version) to aid in version control and release management.

When using standard version to cut a release, there is automated changelog modifitions made based on commit messages.

```csharp
// If you typically use npm version to cut a new release, do this instead:
npm run release
// To cut a release and bump the version by major, minor, or patch, use the following respectively:
npm run release-major // major bump
npm run release-minor // minor bump
npm run release-patch // patch bump
// To cut a pre-release:
npm run prerelease // v0.2.1 to v0.2.2-rc.0
```
