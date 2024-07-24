//Logs a message in the console with a variable
function runScript(userName) {
  console.log(`Macro executed by: ${userName}`);
}

/*

This macro grabs the username, shoots it over to Github, and then that macro posts the result into the chat.
This part of the macro goes into a Foundry Script Macro

(async () => {
  const url = 'https://raw.githubusercontent.com/KBTHIES/ISEKAI-Roll-Macro/main/macro.js';
  const response = await fetch(url);
  if (response.ok) {
    const scriptContent = await response.text();
    const userName = game.user.name; // Get the name of the user who executed the macro

    // Create a new function to encapsulate the script
    const scriptFunction = new Function('userName', scriptContent + '\nrunScript(userName);');
    
    // Call the function with the user name
    scriptFunction(userName);
  } else {
    console.error('Failed to fetch script:', response.statusText);
  }
})();

*/