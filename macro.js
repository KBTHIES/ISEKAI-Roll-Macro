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
  /*
  console.log(game);
  console.log(chara);
  console.log(attack);
  console.log(statLabel);
  console.log(rolledStat);
  */

  //fetch stat name, # of dice, actor for Debuffs and Buffs. If GM, repeat rolls.
  // if it's an item, fetch damage multiplier , range, relevant Abilities
  // if it's a skill, add Experienced
  // add bonuses from Buffs and Debuffs
  // if there's someone targeted, grab their threshold?
  // add checkbox for Gear Kit Applicable?

  /* What variables need to be passed?
  
  From the Game:
  game
  
  From the Character:
  chara
  attack
  statLabel
  rolledStat
  
  */

  // If user isn't GM, hide the repeat rolls section
  GMHidden = "";
  if (!game.user.isGM) {
    GMHidden = "style = \"display: none\"";
  }

  if (typeof statLabel === 'undefined') {
    ui.notifications.info("Don't run this macro directly, run it from the character sheet");
    return ("ISEKAI Macro was run directly");
  }

  /*################
  #    Initialize Variables   #
  ################*/


  const sl = statLabel; //string used for description
  const rs = rolledStat; //instmath, literal prop to look for
  const ce = chara.entity;
  const cp = ce.system.props;
  var targetsName = "";
  var icon = "";
  const attackBool = attack;
  const rollTypeLookup = {
    "Instinct": "ability", "Strength": "ability", "Endurance": "ability",
    "Knowledge": "ability", "Agility": "ability", "Imagination": "ability",
    "Appeal": "skill", "Athletics": "skill", "Magic": "skill",
    "Moxie": "skill", "Rage": "skill", "Reflexes": "skill",
    "Search": "skill", "Stealth": "skill", "Survival": "skill"
  };
  const articleTypeLookup = {
    "Instinct": "an", "Strength": "a", "Endurance": "an",
    "Knowledge": "a", "Agility": "an", "Imagination": "an",
    "Appeal": "an", "Athletics": "an", "Magic": "a",
    "Moxie": "a", "Rage": "a", "Reflexes": "a",
    "Search": "a", "Stealth": "a", "Survival": "a"
  };
  const shortenedLookup = {
    "Instinct": "Inst", "Strength": "Str", "Endurance": "End",
    "Knowledge": "Know", "Agility": "Agi", "Imagination": "Imag"
  };
  var gearSuccCount = 0;
  var gearSuccString = "";
  var GearHidden = "";

  //Roll Variables
  var rolledThreshold = 4; //this sets the default threshold
  var multiplierLabel = "(Optional) Multiplier:";
  var rolledMultiplier = 1;
  var rolledAddedSuccesses = 0;
  var rolledReroll = 0;
  var rolledRepeats = 1;
  var preThreshold = 4;
  var diceMessage = "";
  //var diceFormat = ["","⚀","⚁","⚂","⚃","⚄","⚅"];
  var diceFormat = ["", "fa-solid fa-dice-one", "fa-solid fa-dice-two", "fa-solid fa-dice-three", "fa-solid fa-dice-four", "fa-solid fa-dice-five", "fa-solid fa-dice-six"];
  var diceFailColor = "#757575";
  var diceSucceedColor = "#7aa574";
  var diceCounter = 0;
  var ThresholdHidden = "";

  // Determines if the formula uses the old (Damage-DR) or new (Multi-DR) DR Systems
  var useOldDR = false;
  var oldDrVal = 0;

  //Target Variables
  var selectedTokens = [];
  var targetsArmorThreshold = [];
  var targetsDR = 0;
  var targetsGrappled = false;
  var targetsGrappling = false;
  var targetMessage = "<b>Targets:</b><div style=\"border: 1px solid black; background-color: white; padding:5px; \" >";
  var targetMessageEnd = "</div>";
  var targetModifierBool = false;
  var loggedSuccesses = 0;
  var targetActorArray = [];
  var targetMessageArray = [];
  var targetSuccesses = 0;

  //Weapon Variables
  var weaponMessage = "<b>Your Weapon:</b><div style=\"border: 1px solid black; background-color: LightGray; padding:5px; \" >";
  var weaponMessageEnd = "</div>";
  var weaponName = "";
  var weaponValidForAttack = false;

  //Modifiers
  var modifiersPresent = false;
  var modifierMessage = "<b>Modifiers Applied:</b><ul>";
  var modifierMessageEnd = "</ul>";
  var setDiceRoll = 0; // Set to 1 for Minimize, 6 for Maximize

  // Find out if it's a reroll or not
  console.log(Object.getOwnPropertyDescriptor(cp, rs).value);
  var statDice = parseInt(Object.getOwnPropertyDescriptor(cp, rs).value); //Grabs value of the prop listed in rolledStat
  console.log(cp);

  /*################################
  #    Combat vs Narrative Formatting & Handling   #
  #################################*/
  //If it's an attack:
  // - say "(name) attacks (name) with (stat)!"
  // - set rolledThreshold to target threshold
  // - - grab target stats
  // - hide the gear kit checkbox
  // - show weapon choice radio buttons
  // if not:
  // - say "(name) rolls (stat)"
  // - don't change rolledThreshold 

  var rollTitle = "";
  if (attackBool) {
    /*##################
    #    Grab Target Data  #
    ##################*/
    //If there's a token targeted, grab their armor threshold

    if (game.user.targets.size > 0) {
      targetModifierBool = true;
      //initialized an array at start to hold all the options. We expect 1 but there might be more.
      //Grab all targeted tokens and shove them into an array
      game.user.targets.forEach(e => selectedTokens.push(e));

      // If it's an attack, we'll want to change what Multiplier is labeled as, since weapons have multiplier by default
      // That also means we want to change it from 1 to 0 (default multiply by 1 vs added multiplier)
      var multiplierLabel = "(Optional) Added Multiplier:";
      var rolledMultiplier = 0;

      // We'll also want to change the threshold to 0 since attack thresholds are based on the targets
      // We can use this as a modifer, so it'll be treated as something like -1 or +3
      rolledThreshold = 0;

      for (let i = 0; i < selectedTokens.length; i++) {

        // For each selected token, we need to extract all of the values

        const Target = game.actors.get(selectedTokens[i].document.actorId);

        let selTokenProps = Target.system.props;

        console.log("Target");
        console.log(Target);

        // Then we construct a new a object that's cleaner and easier to sort through
        // Basically we boil down the selected tokens into the values that matter
        let targetActor = {

          armorThreshold: selTokenProps.armor,
          dr: selTokenProps.buffDR,
          grappled: selTokenProps.debuffGrapple,
          grappling: selTokenProps.buffGrapple,
          targetsName: Target.name,
          modifiers: [],

        };
        // Then we move that into an array that can be reached globally
        targetActorArray.push(targetActor);

      }

      // If there's a single target selected, the popup will be specific
      if (targetActorArray.length > 1) {
        rollTitle = ce.name + " attacks " + "multiple targets" + " with " + sl;
      } else {
        rollTitle = ce.name + " attacks " + targetActorArray[0].targetsName + " with " + sl;
      }

      // Combat icon
      icon = `<i class="fa-regular fa-burst fa-shake fa-2xl" style="color: #000000;"></i>`;

      /* #### Target Statuses ####*/
      // Looks for all the valid modifiers and cooks up a message detailing what modifiers they have
      // This is used in the popup
      // The modifier string is also pushed to the array of target props
      function addTargetInfo(index, modifierString) {
        targetModifierBool = true;
        targetMessage += "<br>- " + modifierString;
        targetActorArray[index].modifiers.push(modifierString);
      };

      for (let i = 0; i < targetActorArray.length; i++) {

        // Add a horizontal line between each actor
        if (i > 0) {
          targetMessage += "<hr>"
        }

        // Cook up some text, at the top in bold is the target's name, and then the Armor Threshold
        targetMessage += "<b>" + targetActorArray[i].targetsName + "</b><br><span>Armor Threshold ";

        // Threshold is left as a button so it has a value that + and - buttons can operate on
        targetMessage += `<input type=\"button\" onclick=\"setValue(threshold` + i + `, ` + targetActorArray[i].armorThreshold + `);\" id=\"threshold` + i + `\" name=\"threshold` + i + `\" value=\"` + targetActorArray[i].armorThreshold + `\"></input>   `;
        targetMessage += `<input type=\"button\" onclick=\"changeValue(threshold` + i + `, 1);\" value = \"+\"></input>`;
        targetMessage += `<input type=\"button\" onclick=\"changeValue(threshold` + i + `, -1);\" value = \"-\"></input></span>`;

        /*##############
       #    Target Modifiers   #
       ##############*/
        // I just want these to output messages, since code now accounts for vales by target
        // Looks through the targets and looks for modifiers
        if (targetActorArray[i].dr != 0) {
          //rolledMultiplier -= parseInt(targetsDR);
          addTargetInfo(i, targetActorArray[i].targetsName + " has DR " + targetActorArray[i].dr);
        }
        if (targetActorArray[i].grappled) {
          //rolledThreshold --;
          addTargetInfo(i, targetActorArray[i].targetsName + " is Grappled (TR 1)");
        }
        if (targetActorArray[i].grappling) {
          //rolledThreshold ++;
          addTargetInfo(i, targetActorArray[i].targetsName + " is Grappling (TI 1)");
        }
      }





      console.log("targetActorArray");
      console.log(targetActorArray);







      /*##############
      #    Weapon Chooser   #
      ##############*/
      grabWeapons();

      function grabWeapons() {
        console.log(ce.items);

        // Keep track if there's any items, will be made false once it finds one
        let noWeaponsEquipped = true;
        // This is the line of stats that's visible where you select your weapon when attacking 
        let addToWeaponMessage = "";

        // Track current weapon
        let currInt = 1;

        // Add a Boss Attack version for Bosses, since they have damage stats but maybe no weapons
        if (cp.bossDamage != undefined) {
          addToWeaponMessage +=
            "<input type=\"radio\" id=\"weapon" + currInt + "\" name=\"weapon\" value=\" " + cp.bossDamage + "%Boss Attack%true%" + " \" checked /> <label for=\"weapon" + currInt +
            "\"><b>Boss Attack</b> [ " + cp.attackRange + " | " + cp.bossDamage + " Damage]"
            + "</label><br>";
        }

        // Check each equipped item
        ce.items.forEach(w => {
          // Looks specifically at the weapon's props
          let wProps = w.system.props;

          // If it's a weapon and it's equipped, look at it
          if (wProps.itemEquipState == 1 && wProps.itemTypeInt == 2) {

            //Look at both wepAbilities and see if they match what the attack's using
            let wepAbilities = wProps.itemWeaponAbilities.split("/");
            wepAbilities.forEach((wa) => weaponValidation(wa));

            // use sl and look in shortenedLookup, returns Str, Agi etc
            function weaponValidation(wa) {
              // if they  match, set validAttack to True
              if (wa == shortenedLookup[sl]) {
                weaponValidForAttack = true;
              }
            }

            // Add the weapon to the weapon message queue
            // Weapon values contain damage multiplier, name, if it's valid or not, and [unused] the link to the item
            // Formatted as multiplier%name%valid%link
            // Foundry doesn't seem to like putting the item's link in chat consistently
            addToWeaponMessage +=
              "<input type=\"radio\" id=\"weapon" + currInt + "\" name=\"weapon\" value=\" " + wProps.itemDamageInput + "%" + wProps.itemNameInput + "%" + weaponValidForAttack + "%" + w.link + " \" checked /> <label for=\"weapon" + currInt + "\">";

            // If the weapon isn't valid, it'll add in <del></del> which crosses it out
            if (!weaponValidForAttack) { addToWeaponMessage += "<del>" }
            addToWeaponMessage += ("<b>" + wProps.itemNameInput + "</b> [ " + wProps.itemWeaponAbilities + " | " + wProps.itemRangeInput + " | " + wProps.itemDamageInput + " Damage]" + "</label>");
            if (!weaponValidForAttack) { addToWeaponMessage += "</del>" }
            addToWeaponMessage += "<br>";

            // Looking through weapons Loop Handling
            currInt++;
            noWeaponsEquipped = false;
          }

        });

        // Add a special message to not use a weapon
        // Doesn't need to be valid since it's always valid, and of course no item means no link
        addToWeaponMessage +=
          "<input type=\"radio\" id=\"weapon" + currInt + "\" name=\"weapon\" value=\"0%Weaponless Attack%true%\" /> <label for=\"weapon" + currInt + "\"><b>" +
          "Weaponless Attack" + "</b> [Set Damage Multiplier below]"
          + "</label><br>";

        weaponMessage += "<div>" + addToWeaponMessage;
        weaponMessageEnd += "</div>";
      }

    } else {
      // If the attack's length of targets is 0, then return an error
      ui.notifications.info("No token targeted!");
      return ("No Token Targeted");
    }

    // Hide the Gear checkbox and Threshold input, those aren't needed in combat
    GearHidden = "display: none;";
    ThresholdHidden = "display: none;";

  } else {
    // Whatever needs to be done if it's not an attack
    /*##################
    #    Narrative Roll Handler   #
    ##################*/

    // We don't want to display the target or weapon messages in the roll pop-up
    targetMessage = "";
    weaponMessage = "";
    weaponMessageEnd = "";

    // Display it as just Name rolls Stat
    rollTitle = ce.name + " rolls " + sl;

    // Narrative Icon
    icon = `<i class="fa-regular fa-dice fa-shake fa-2xl" style="color: #000000;"></i>`;

    // Gear Kits add successes based on if it's a Skill or Ability
    // Also renders a message in the popup with added successes if the Gear Kit is helpful
    if (rollTypeLookup[statLabel] == "ability") {
      gearSuccCount = 1;
      gearSuccString = gearSuccCount + " additional success";
    } else if (rollTypeLookup[statLabel] == "skill") {
      gearSuccCount = 2;
      gearSuccString = gearSuccCount + " additional successes";
    }
  }

  /*##################
  #    Buff & Debuff Handler   #
  ##################*/
  //modifiersPresent - boolean is False, if any relevant buff is present then flip it to True
  // also append it to modifier list.
  function addModifier(modifierString) {
    modifiersPresent = true;
    modifierMessage += "<li>" + modifierString + "</li>";
  }

  /*===============\
  |     Number of Dice     |
  \===============*/
  /* #### Player Statuses ####*/
  if (cp.buffAddD6 != 0) {
    statDice += parseInt(cp.buffAddD6);
    addModifier("+" + cp.buffAddD6 + "D6");
  }
  /*==========\
  |    Threshold     |
  \==========*/
  /* #### Experienced ####*/
  //look at rs, skills should be named __Exp, like appl and applExp
  // if __Exp is false or not present (like instmodExp) then ignore
  // if present, TR 1
  let expCheck = cp[rs + "Exp"];
  if (expCheck) {
    rolledThreshold--;
    addModifier("Experienced (TR 1)");
  }
  /* #### Player Statuses ####*/
  if (cp.buffFury) {
    rolledThreshold--;
    addModifier("Fury (TR 1)");
  }
  if (cp.buffTR != 0) {
    rolledThreshold -= parseInt(cp.buffTR);
    addModifier("TR " + cp.buffTR);
  }
  if (cp.debuffTI != 0) {
    rolledThreshold += parseInt(cp.debuffTI);
    addModifier("TI " + cp.debuffTI);
  }
  /*===================\
  |     Multiplier / Min / Max   |
  \===================*/
  /* #### Player Statuses ####*/
  if (cp.buffAddMultiplier != 0) {
    rolledMultiplier += parseInt(cp.buffAddMultiplier);
    addModifier("Multiplier +" + cp.buffAddMultiplier);
  }
  // Block to handle Maximize and Minimize
  if (cp.buffMaximize || cp.debuffMinimize) {
    if (!cp.buffMaximize) {
      //Then it's only Minimize
      addModifier("Roll Minimized");
      setDiceRoll = 1;
    } else if (!cp.debuffMinimize) {
      // Then it's only Maximize
      addModifier("Roll Maximized");
      setDiceRoll = 6;
    } else {
      //Then it's both
      addModifier("Roll Maximized and Minimized, no change");
    }
  }
  /*=======\
  |    Reroll     |
  \=======*/
  /* #### Player Statuses ####*/
  if (cp.buffReroll != 0) {
    rolledReroll += parseInt(cp.buffReroll);
    addModifier("Reroll " + cp.buffReroll);
  }
  /*==================\
  |     Additional Successes   |
  \==================*/
  /* #### Player Statuses ####*/
  if (cp.buffAddSuccesses != 0) {
    rolledAddedSuccesses += parseInt(cp.buffAddSuccesses);
    addModifier(cp.buffAddSuccesses + " added successes");
  }

  //After all roll modifiers have been checked for and there are none, just don't bake the modifier message
  let modifierMessageFull = "";
  if (!modifiersPresent) {
  } else {
    // if they are present, then add a horizontal line and bake it
    modifierMessageFull = `<hr>` + modifierMessage + modifierMessageEnd;
  }

  // Grab all of the roll variables before they get modified so we can see if they're edited by the player later
  // Each one also includes the message to paste when it says X was modified by Y amount
  var rollVars = [{ pre: statDice, label: "Number of Dice" }, { pre: rolledThreshold, label: "Threshold" },
  { pre: rolledMultiplier, label: "Multiplier" }, { pre: rolledReroll, label: "Reroll" },
  { pre: rolledAddedSuccesses, label: "Added Successes" }];

  // Also grab the pre-edit thresholds of any targets
  for (let i = 0; i < targetActorArray.length; i++) {
    let threshLabel = targetActorArray[i].targetsName + "'s Threshold";
    rollVars.push({ pre: targetActorArray[i].armorThreshold, label: threshLabel });
  };

  let confirmed = false;

  /*#############
  #    Create Dialog   #
  #############*/
  const myDialogOptions = {
    width: 400,
    /* height: 400, */
    top: 500,
    left: 500
  };

  // Roll a number of d6 vs a threshold, but include an option for Reroll and Multiplier
  let d = new Dialog({
    title: " ",
    content: `
 	<form>

        `+ icon + `
        <b> `+ rollTitle + `</b>

        <br><hr>
        <table>

  	<tr>
   	<td><label>Number of Dice:</label></td>
   	<td><input type="number" id="dice-number" name="diceNumber" value = "`+ statDice + `"></input></td>
        <td><input type="button" onclick="changeValue(diceNumber, 1);" value = "+"></input></td>
        <td><input type="button" onclick="changeValue(diceNumber, -1);" value = "-"></input></td>
  	</tr>

  	<tr style="`+ ThresholdHidden + `">
   	<td><label>Threshold:</label></td>
   	<td><input type="number" id="threshold" name="threshold" value = "`+ rolledThreshold + `"></input></td>
        <td><input type="button" onclick="changeValue(threshold, 1);" value = "+"></input></td>
        <td><input type="button" onclick="changeValue(threshold, -1);" value = "-"></input></td>
  	</tr>

        </table>
       `+ modifierMessageFull + targetMessage + targetMessageEnd + weaponMessage + weaponMessageEnd + `

        <hr>
            <div style="`+ GearHidden + ` padding-left: 10px;">
                <input type="checkbox" id="gearCheck" name="gearCheck" onclick="checkFlip()"></input>
                <label for="gearCheck"><b> Gear Kit Helpful? </b></label>
                <small id="gearSuccStyle" style="display:none;"> This will add `+ gearSuccString + ` (not shown below)</small>
            </div>
        <br>
        <table>

  	<tr>
   	<td><label>` + multiplierLabel + `</label></td>
   	<td><input type="number" id="multiplier" name="multiplier" value="`+ rolledMultiplier + `"></input></td>
        <td><input type="button" onclick="changeValue(multiplier, 1);" value = "+"></input></td>
        <td><input type="button" onclick="changeValue(multiplier, -1);" value = "-"></input></td>
  	</tr>

        <tr>
   	<td><label>(Optional) Additional Successes:</label></td>
   	<td><input type="number" id="addsucc" name="addsucc" value="`+ rolledAddedSuccesses + `"></input></td>
        <td><input type="button" onclick="changeValue(addsucc, 1);" value = "+"></input></td>
        <td><input type="button" onclick="changeValue(addsucc, -1);" value = "-"></input></td>
  	</tr>

  	<tr>
   	<td><label>(Optional) Reroll:</label></td>
   	<td><input type="number" id="reroll" name="reroll" value="`+ rolledReroll + `"></input></td>
        <td><input type="button" onclick="changeValue(reroll, 1);" value = "+"></input></td>
        <td><input type="button" onclick="changeValue(reroll, -1);" value = "-"></input></td>
  	</tr>

        <tr `+ GMHidden + `>
   	<td><label>(Optional) Repeat Rolls:</label></td>
   	<td><input type="number" id="repeat" name="repeat" value="`+ rolledRepeats + `"></input></td>
        <td><input type="button" onclick="changeValue(repeat, 1);" value = "+"></input></td>
        <td><input type="button" onclick="changeValue(repeat, -1);" value = "-"></input></td>
  	</tr>

 	</table>

          <script>
        /*#############################
        #    Function to make + and - buttons work   #
        #############################*/
        function changeValue(target, change)
                    {
                    var value = parseInt(document.getElementById(target.id).value, 10);
                    value = isNaN(value) ? 0 : value;
                    value += change;
                    document.getElementById(target.id).value = value;
                    }

        /*########################
        #    Function to make setValue work   #
        ########################*/
        function setValue(target, change)
                    {
                    var value = parseInt(document.getElementById(target.id).value, 10);
                    value = isNaN(value) ? 0 : value;
                    value = change;
                    document.getElementById(target.id).value = value;
                    }

        /*#########################
        #    Function to make checkbox work   #
        #########################*/
        function checkFlip() {
            var decider = document.getElementById('gearCheck');
            if(decider.checked){
                document.getElementById('gearSuccStyle').style.display = "inline";
            } else {
                document.getElementById('gearSuccStyle').style.display = "none";
            }
        }
        </script>

        </form>
 	`,
    buttons: {
      one: {
        icon: '<i class="fas fa-check"></i>',
        label: "Roll!",
        callback: () => confirmed = true
      },
      two: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel",
        callback: () => confirmed = false
      }
    },
    default: "Cancel",
    close: html => {
      if (confirmed) {

        /*#############
        #    Dice Roll Math   #
        #############*/

        // Grab all of the entered variables
        let gearBool = html.find('[name=gearCheck]')[0].checked;
        let diceNumber = parseInt(html.find('[name=diceNumber]')[0].value);
        let threshold = parseInt(html.find('[name=threshold]')[0].value);
        let multiplier = parseInt(html.find('[name=multiplier]')[0].value);
        let reroll = parseInt(html.find('[name=reroll]')[0].value);
        let addsucc = parseInt(html.find('[name=addsucc]')[0].value);
        let repeatRolls = parseInt(html.find('[name=repeat]')[0].value);
        let armorThresholds = []; //Here we'll push the found thresholds

        // Have to initialize this before we search for armor thresholds
        // I couldn't think of a way to programmatically add the armor thresholds, so it's an array
        const submittedTable = [diceNumber, threshold, multiplier, reroll, addsucc];
        var playerModifierTable = [0, 0, 0, 0, 0];

        // Grab the potentially edited armor thresholds
        for (let i = 0; i < targetActorArray.length; i++) {
          let threshLabel = "threshold" + i;
          armorThresholds.push(parseInt(html.find('[name=' + threshLabel + ']')[0].value));
          submittedTable.push(armorThresholds[i]);
          playerModifierTable.push(0);
        };

        /*##### - See if any variables were edited - ####*/
        // This bool is flipped to true if there are any edits
        var playerMadeEdits = false;
        // If any edits are found, snitch in chat
        var editsMessage = "";
        console.log(rollVars);

        //For each variable, check for changes
        for (let i = 0; i < submittedTable.length; i++) {
          if (rollVars[i].pre != submittedTable[i]) {

            // If changes found, log them
            playerMadeEdits = true;
            playerModifierTable[i] = (submittedTable[i] - rollVars[i].pre);
            editsMessage += "" + rollVars[i].label + " was changed by " + (submittedTable[i] - rollVars[i].pre) + " (originally " + rollVars[i].pre + ") <br>\n"
          }
        }
        if (playerMadeEdits) {
          console.warn(game.user.name + " made edits in the roll macro.\n" + editsMessage);
        }

        // If it was an attack, then we need to find the selected weapon
        var getSelectedWeapon = document.querySelector('input[name="weapon"]:checked');

        // If we find the selected weapon, then break it apart
        if (getSelectedWeapon != null) {
          // Weapon value is Multiplier%Name of Weapon%valid attack%link, so we have to split the value
          let unparsedWeapon = getSelectedWeapon.value.split("%");

          // First value is Multiplier
          let weaponMulti = parseInt(unparsedWeapon[0]);
          // Second value is Name
          weaponName = unparsedWeapon[1];
          // Third value is if it's valid
          weaponValidForAttack = unparsedWeapon[2] == 'true';

          // If weapon has a link, use it instead of just the name
          // Foundry didn't like this, so it's commented out
          /*if(unparsedWeapon[3] != ""){
              let trueName = unparsedWeapon[3];
              weaponName = trueName;
          console.log(unparsedWeapon[3]);
          }*/

          /*####################
          #    Dice Roll Math Modifiers   #
          ###################*/

          // Add weapon multiplier to the added multiplier
          // Remember, with attacks, the Multiplier is set to 0 instead of 1 by default
          multiplier += weaponMulti;
        }

        // Apply effects of checking the Gear Kit box
        if (gearBool) {
          addModifier("Gear Kit (" + gearSuccCount + " additional successes)");
          addsucc += gearSuccCount;
        }

        // totals up number of dice rolled, including reroll if greater than 0
        let dice = diceNumber + reroll;

        let rollFormula = dice + "d6";

        // If there's reroll, add the Keep Highest clause
        if (reroll > 0) {
          rollFormula = rollFormula + "kh" + diceNumber;
        }
        /*
                        // If there's Maximize or Minimize, set that
                        // completely overrides reroll
                        if(setDiceRoll != 0){
                            rollFormula = setDiceRoll;
                            for(let i=1; i<diceNumber; i++){
                                rollFormula += (", " + setDiceRoll);
                            }
                            rollFormula = "{" + rollFormula + "}";
                        }
        */

        /*#############
        #    Roll Insurance   #
        #############*/
        // Warns the user if something's up, as well as pushes a warning into the console
        function addWarning(warningString) {
          ui.notifications.info(warningString);
          console.warn("### Warning! - " + ce.name + " - " + warningString + " - ###");
        }

        // # of Dice
        // Make sure that after all modifiers, rolled dice is no less than 0
        if (diceNumber < 0) {
          addWarning("Number of dice (" + diceNumber + ") was less than 0");
          diceNumber = 0;
        }

        // Threshold
        // Make sure that after all modifiers, threshold is no less than 1 or greater than 6
        // However, we only do this if it's not an attack. If it's an attack, we just skip this.
        if (!attackBool) {
          if (threshold > 6) {
            addWarning("Thresholds greater than 6 (" + threshold + ") are treated as if Threshold was 6");
            preThreshold = threshold;
            threshold = Math.min(threshold, 6);
          } else if (threshold < 1) {
            addWarning("Thresholds lower than 1 (" + threshold + ") are treated as if Threshold was 1");
            preThreshold = threshold;
            threshold = Math.max(threshold, 1);
          }
        } else {
          // Do we need to go through armorThresholds and validate them?
        }

        // Multiplier
        // Make sure that after all modifiers, multiplier is no less than 0
        if (multiplier < 0) {
          addWarning("Multipliers lower than 1 (" + multiplier + ") are treated as 0");
          multiplier = 0;
        }

        // Reroll
        //Make sure that after all modifiers, rerolls is no less than 0
        if (reroll < 0) {
          addWarning("Reroll less than 1 (" + reroll + ") are treated as 0");
          reroll = 0;
        }

        // Repeat Rolls
        //Make sure that after all modifiers, repeat rolls is no less than 1
        if (repeatRolls < 1) {
          addWarning("Repeats less than 1 (" + repeatRolls + ") are treated as 1");
          repeatRolls = 1;
        }

        /*#########
        #    The Roll    #
        #########*/
        for (let i = 0; i < repeatRolls; i++) {

          ISEKAIRoll(rollFormula, threshold, addsucc, multiplier, diceNumber, preThreshold);

          async function ISEKAIRoll(rollFormula, threshold, addsucc, multiplier, diceNumber, preThreshold) {
            const roll = await new Roll("(" + rollFormula + "cs>=" + threshold + "+" + addsucc + ")*" + multiplier).evaluate({ async: true });
            const mode = game.settings.get("core", "rollMode");

            // Set up our roll message
            let chatMessage = `<h4>` + ce.name + ` rolls ` + articleTypeLookup[statLabel] + ` ` + sl;

            // Check and see if Threshold was changed
            let verifiedThreshold = 0;
            if (preThreshold != 4) {
              verifiedThreshold = (preThreshold + ` (effectively ` + threshold + `)`);
            } else {
              verifiedThreshold = threshold;
            }

            // If you hover over the roll macro, it'll list successes by threshold
            let thresholdTooltip = "";
            let rollResults = roll.dice[0].results;

            function thresholdCheck(dice, thresh) {
              if (dice.result >= thresh) {
                loggedSuccesses++;
              }
            };

            for (let i = 1; i <= 6; i++) {
              loggedSuccesses = 0;
              rollResults.forEach((d) => thresholdCheck(d, i));
              thresholdTooltip += "Threshold " + i + " - " + (loggedSuccesses + addsucc) + " Successes\n";
            }

            // If there's a Multiplier in a roll (or a multiplier of 0 in an attack), change readout to X Successes (Y Successes)
            // where X is post-multi and y is pre-multi
            let postedSuccesses = "";
            let postedSuccessMessage = "";
            let multiplierMessage = " and a multiplier of " + multiplier;
            if (multiplier == 0) {
              // Divides successes by multiplier to grab successes, but this can divide by 0
              postedSuccesses = 0;
            } else {
              postedSuccesses = roll.total / multiplier;
            }
            // If it's an attack || multiplier is >1, display it
            if (attackBool || multiplier > 1) {
              postedSuccessMessage = " (" + postedSuccesses + " Successful Dice)";
            } else {
              postedSuccessMessage = "";
              multiplierMessage = "";
            }


            // Roll Type
            if (attackBool) {

              /*############################
              #   Reformat targetMessage for the attack   #
              ############################*/

              console.log(targetActorArray);

              // Turns rolled dice into green or grey icons
              function diceMessageFormat(d, t) {

                // If Maximized or Minimized, treat setDiceRoll as the dice result
                if (setDiceRoll != 0) { d = setDiceRoll }

                // This keeps track of when a pair of newlines are needed, or they'll overflow in an ugly way
                diceCounter++;
                // Add the die icon
                diceMessage += `<i class="` + diceFormat[d] + ` fa-2xl" style="color: `;

                // Threshold Validation
                if (t > 6) {
                  t = Math.min(t, 6);
                } else if (threshold < 1) {
                  t = Math.max(t, 1);
                }

                // Color the icon based on success or fail
                if (d >= t) {
                  diceMessage += diceSucceedColor;
                  // Increase a global variable so we can track successful dice
                  targetSuccesses++;
                } else {
                  diceMessage += diceFailColor;
                }
                diceMessage += `\;"></i> `;

              }

              // Initialize the message that's posted in chat, which is different from the attack pop-up
              targetMessage = "<b>Targets:</b><div style=\"padding:2px\"></div>";

              for (let i = 0; i < targetActorArray.length; i++) {
                // Clean up some variables to be safe
                diceMessage = "";
                diceCounter = 0;
                targetSuccesses = 0;

                // Calculate Threshold
                // armorThresholds is the user input value, threshold accounts for Fury or TRX on the character sheet
                let targetThreshold = armorThresholds[i] + threshold;
                // Track how target statuses affect threshold
                let targetThresholdModifiers = 0;
                if (targetActorArray[i].grappling) { targetThreshold++; targetThresholdModifiers++ }
                if (targetActorArray[i].grappled) { targetThreshold--; targetThresholdModifiers-- }
                roll.dice[0].results.forEach((d) => diceMessageFormat(d.result, targetThreshold));

                // First part is the Targets: text
                targetMessage += "<details><summary style=\"font-size: 1.25em\">";
                targetMessage += targetActorArray[i].targetsName;

                // Second part shows Damage and Successful Dice;
                // Implement Old DR
                let damageCalc = 0;
                if (useOldDR) {
                  damageCalc = ((targetSuccesses + addsucc) * (multiplier)) - targetActorArray[i].dr;
                  oldDrVal = targetActorArray[i].dr;
                  targetActorArray[i].dr = 0
                } else {
                  damageCalc = (targetSuccesses + addsucc) * (multiplier - targetActorArray[i].dr);
                }

                targetMessage += `<hr><span title="${(targetSuccesses + addsucc)} Successes x Multiplier of ${multiplier - targetActorArray[i].dr} `;
                if (useOldDR && oldDrVal != 0) { targetMessage += `, - ${oldDrVal} DR` }
                targetMessage += `\nHalves to ${Math.ceil(damageCalc / 2)}">${damageCalc} Damage</span>`;
                targetMessage += `<span title="Successes:\n${targetSuccesses} from Rolled Dice\n${cp.buffAddSuccesses} from Modifiers\n${playerModifierTable[4]} from Player Input"> (${(targetSuccesses + addsucc)} Successes`;
                if (useOldDR && oldDrVal != 0) { targetMessage += `, ${oldDrVal} DR` }
                targetMessage += `)</span></summary>`;

                // Third part is the Xd6 vs Threshold of Y, Multiplier Z text
                targetMessage += "<p style=\"border: 1px solid black; background-color: LightGray; padding:5px; \">";
                targetMessage += `<span title="Number of Dice:\n${statDice - cp.buffAddD6} from ${statLabel}\n${cp.buffAddD6} from Modifiers\n${playerModifierTable[0]} from Player Input">${diceCounter}d6 </span>`;
                targetMessage += `vs`;
                targetMessage += `<span title="Threshold:\n${targetActorArray[i].armorThreshold} from Target's Armor\n${targetThresholdModifiers} from Target's Statuses\n${cp.debuffTI - cp.buffTR} from Player Modifiers\n${playerModifierTable[(5 + i)]} from Player Input"> Threshold of ${targetThreshold}</span>,`;

                targetMessage += `<span title="Multiplier:\n${multiplier - rollVars[2].pre - playerModifierTable[2]} from Weapon\n${-targetActorArray[i].dr} from Target DR\n${cp.buffAddMultiplier} from Modifiers\n${playerModifierTable[2]} from Player Input"> Multiplier ${multiplier - targetActorArray[i].dr}</span>`;
                targetMessage += "</p>";

                // If Threshold is above 6 or less than 1, give a warning
                if (targetThreshold < 1 || targetThreshold > 6) {
                  targetMessage += `<p style=\"border: 1px solid black; background-color: LemonChiffon; padding:5px; \">`;
                  if (targetThreshold < 1) {
                    targetMessage += `Thresholds below 1 are treated as 1`;
                  } else {
                    targetMessage += `Thresholds above 6 are treated as 6`;
                  }
                  targetMessage += `</p>`;
                }

                // Fourth part is any modifiers
                // We only want this to run if there are modifiers
                if (targetActorArray[i].modifiers.length > 0) {
                  targetMessage += "<p style=\"border: 1px solid black; background-color: white; padding:5px; \">";
                  for (let j = 0; j < targetActorArray[i].modifiers.length; j++) {
                    targetMessage += targetActorArray[i].modifiers[j] + "<br>";
                  }
                }
                // Fifth and Final part is cleaning up the </>s
                targetMessage += "</p><div style=\"padding:5px;line-height:2em;\">" + diceMessage + "</div><hr>";
                targetMessage += "</details>";
              }





              console.log("targetMessage");
              console.log(targetMessage);




              // Attack label for the chat log - Who's being attacked
              let targetLabel = "";
              if (targetActorArray.length > 1) {
                targetLabel = "multiple targets";
              } else {
                targetLabel = targetActorArray[0].targetsName;
              }

              // Attack label for the chat log - What weapon's being used
              chatMessage += ` attack against ` + targetLabel + ` using their ` + weaponName + `</h4>`;
              // Put a warning in chat if it's not valid
              if (!weaponValidForAttack) { chatMessage += "<i>Weapon is not valid for this attack!</i>" }

              /*#### Values that I want to hide if they're an attack ####*/
              /*
              ##########################################
                                          // Xd6 vs Threshold, Multiplier
                                          chatMessage += (`<h3><span title="` + thresholdTooltip + `">${diceNumber}d6 against a threshold of ${verifiedThreshold}`+ multiplierMessage +`</span></h3>`);
                                      
                                          // If damage, we want a tooltip that shows what it would be halved
                                          let damageTooltip = "Halves to " + Math.ceil(roll.total/2);
                                          chatMessage += (`<h2><span title="` + damageTooltip + `">${roll.total} Damage</span>` + postedSuccessMessage + `</h2>`);
              ##########################################
              */
            } else {
              chatMessage += ` check</h4>`;
              // Xd6 vs Threshold
              chatMessage += (`<h3><span title="` + thresholdTooltip + `">${diceNumber}d6 against a threshold of ${verifiedThreshold}` + multiplierMessage + `</span></h3>`);
              chatMessage += (`<h2>${roll.total} Successes` + postedSuccessMessage + `</h2>`);
            }

            // Modifiers
            if (modifiersPresent) {
              chatMessage += `<div style=\"border: 1px solid black; background-color: LightGray; padding:5px; \" >`;
              chatMessage += modifierMessage;
              chatMessage += `</div>`;
            }

            // Target Modifiers
            if (targetModifierBool) {
              if (modifiersPresent) {
                chatMessage += `<div style=\"padding:2px\"></div>`;
              }
              // Contains own div boundary and title
              chatMessage += targetMessage;
            }

            console.log("targetModifierBool");
            console.log(targetModifierBool);
            console.log("chatMessage");
            console.log(chatMessage);



            /*
                                    // Show the Dice Rolled
                                    chatMessage += `<br>` + diceMessage;
            */
            // Player Made Edits
            if (playerMadeEdits) {
              if (modifiersPresent || targetModifierBool) {
                chatMessage += `<div style=\"padding:2px\"></div>`;
              }
              chatMessage += `<div style=\"border: 1px solid black; background-color: LightGray; padding:5px; \" >`;
              chatMessage += `<b>` + game.user.name + ` made the following edits:</b><br>`;
              chatMessage += editsMessage;
              chatMessage += `</div><br>`;
            }

            // Add a button for Reroll
            if (reroll > 0) {
              //chatMessage += `<input type="button" onclick="rerollTime("appl");" value = "Reroll ${reroll}"></input>`;
              chatMessage += `[[/roll ${reroll}d6cs>=${4}]]{Reroll ${reroll}}`;
            }
            async function rerollTime(rerollVal) {
              console.log(chara);
              console.log(statLabel);
              console.log(attack);
              return await game.macros.getName('ISEKAI Roll').execute({ chara: chara, statLabel: statLabel, rolledStat: rerollVal, attack: attack });
            }

            const messageData = {
              rolls: [roll],
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              flavor: chatMessage,
              speaker: ChatMessage.getSpeaker(),
              user: game.user._id,
              _renderRollHTML: { isPrivate: true }
            };

            ChatMessage.applyRollMode(messageData);
            await ChatMessage.create(messageData);
          }
        }
      }
    }
  }, myDialogOptions);

  d.render(true);
}
