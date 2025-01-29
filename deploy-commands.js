require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
    .setName('boek_toevoegen')
    .setDescription('Voeg een boek toe aan de verbondsbibliotheek')
    .addStringOption(option =>
        option.setName('boek')
            .setDescription('Naam van het boek')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('auteur')
            .setDescription('Auteur van het boek')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('status')
            .setDescription('Status van het boek')
            .setRequired(true)
            .addChoices(
                { name: 'Beschikbaar', value: 'Beschikbaar' },
                { name: 'Uitgeleend', value: 'Uitgeleend' },
            ))
    .addStringOption(option =>
        option.setName('eigenaar')
            .setDescription('Eigenaar van het boek')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('uitgeleend_aan')
            .setDescription('Persoon aan wie het boek is uitgeleend')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('beschrijving')
            .setDescription('Beschrijving van het boek')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('taal')
            .setDescription('Taal van het boek')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('front_cover')
            .setDescription('Omslagafbeelding URL (voorzijde van het boek)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('back_cover')
            .setDescription('Omslagafbeelding URL (achterzijde van het boek)')
            .setRequired(false))
    .addIntegerOption(option =>
        option.setName('aantal_bladzijden')
            .setDescription('Aantal bladzijden van het boek')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('categorie_1')
            .setDescription('Categorie 1 van het boek.')
            .setRequired(false)
            .addChoices(
                { name: 'Geschiedenis', value: 'Geschiedenis' },
                { name: 'Wijsbegeerte', value: 'Wijsbegeerte' },
                { name: 'Politiek', value: 'Politiek' },
                { name: 'Literatuur', value: 'Literatuur' },
                { name: 'Sociologie', value: 'Sociologie' },
                { name: 'Biologie', value: 'Biologie' },
                { name: 'Fictie', value: 'Fictie' },
                { name: 'Psychologie', value: 'Psychologie' }
            ))
    .addStringOption(option =>
        option.setName('categorie_2')
            .setDescription('Categorie 2 van het boek.')
            .setRequired(false)
            .addChoices(
                { name: 'Geschiedenis', value: 'Geschiedenis' },
                { name: 'Wijsbegeerte', value: 'Wijsbegeerte' },
                { name: 'Politiek', value: 'Politiek' },
                { name: 'Literatuur', value: 'Literatuur' },
                { name: 'Sociologie', value: 'Sociologie' },
                { name: 'Biologie', value: 'Biologie' },
                { name: 'Fictie', value: 'Fictie' },
                { name: 'Psychologie', value: 'Psychologie' }
            ))
    .addStringOption(option =>
        option.setName('thema')
            .setDescription('Thema van het boek')
            .setRequired(false)),
            new SlashCommandBuilder()
            .setName('toon_bibliotheek')
            .setDescription('Doorzoek de hele verbondsbibliotheek. Geef optioneel auteur, categorie en taal mee. Geef het commando in zonder parameters om alle boeken te laten zien.')
            .addStringOption(option =>
                option.setName('auteur')
                    .setDescription('Auteur van het boek')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('categorie')
                    .setDescription('Filter op categorie')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Geschiedenis', value: 'Geschiedenis' },
                        { name: 'Wijsbegeerte', value: 'Wijsbegeerte' },
                        { name: 'Politiek', value: 'Politiek' },
                        { name: 'Literatuur', value: 'Literatuur' },
                        { name: 'Sociologie', value: 'Sociologie' },
                        { name: 'Biologie', value: 'Biologie' },
                        { name: 'Fictie', value: 'Fictie' },
                        { name: 'Psychologie', value: 'Psychologie' }
                    ))
            .addStringOption(option =>
                option.setName('taal')
                    .setDescription('Filter op taal')
                    .setRequired(false)),        
    new SlashCommandBuilder()
    .setName('zoek_boek')
    .setDescription('Bekijk de details van een boek in de bibliotheek.')
    .addStringOption(option =>
        option.setName('boek')
            .setDescription('Naam van het boek')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('auteur')
            .setDescription('Auteur van het boek')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('status')
            .setDescription('Status van het boek')
            .setRequired(false)
            .addChoices(
                { name: 'Beschikbaar', value: 'Beschikbaar' },
                { name: 'Uitgeleend', value: 'Uitgeleend' },
            ))
    .addStringOption(option =>
        option.setName('eigenaar')
            .setDescription('Eigenaar van het boek')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('uitgeleend_aan')
            .setDescription('Persoon aan wie het boek is uitgeleend')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('taal')
            .setDescription('Taal van het boek')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('categorie')
            .setDescription('Categorieën van het boek (meerdere selecties mogelijk)')
            .setRequired(false)
            .addChoices(
                { name: 'Geschiedenis', value: 'Geschiedenis' },
                { name: 'Wijsbegeerte', value: 'Wijsbegeerte' },
                { name: 'Politiek', value: 'Politiek' },
                { name: 'Literatuur', value: 'Literatuur' },
                { name: 'Sociologie', value: 'Sociologie' },
                { name: 'Biologie', value: 'Biologie' },
                { name: 'Fictie', value: 'Fictie' },
                { name: 'Psychologie', value: 'Psychologie' }
            )),   
    new SlashCommandBuilder()
    .setName('update_boek_status')
    .setDescription('Werk de beschikbaarheid van een boek bij in de verbondsbibliotheek.')
    .addStringOption(option =>
        option.setName('boek')
            .setDescription('Naam van het boek')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('status')
            .setDescription('Nieuwe status van het boek')
            .setRequired(true)
            .addChoices(
                { name: 'Beschikbaar', value: 'Beschikbaar' },
                { name: 'Uitgeleend', value: 'Uitgeleend' }
            ))
    .addStringOption(option =>
        option.setName('uitgeleend_aan')
            .setDescription('Naam van de persoon aan wie het boek is uitgeleend (alleen vereist voor status Uitgeleend)')
            .setRequired(false)),
    new SlashCommandBuilder()
    .setName('help')
    .setDescription('Toon een lijst van beschikbare commando\'s met uitleg over hun werking')
].map(command => command.toJSON());
    

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
})();