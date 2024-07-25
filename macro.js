/*
The macro from the character sheet
%{return await game.macros.getName('ISEKAI Roll').execute({chara: entity, statLabel:"Strength", rolledStat:"strmath", attack: true}) }%<br>${name}$ prepares to attack with Str
%{consoleLog()}%

What variables need to be passed?

From the Game:
game

From the Character:
chara
attack
statLabel
rolledStat

*/


function runScript(game, chara, attack, statLabel, rolledStat) {
  console.log("game:");
  console.log(game);
  console.log(chara);
  console.log("Is attack?: " + attack + "<br>Stat:" + statLabel + "<br>Stat Label:" + rolledStat);
}
