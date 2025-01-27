require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { addBookToAirtable, fetchLibraryDataCompact, searchBook, updateBookStatus } = require('./airtable');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        console.log('Interaction received:', interaction);

        if (!interaction.isCommand()) return;

        const { commandName, options } = interaction;

        if (commandName === 'boek_toevoegen') {
            console.log('boek_toevoegen command received');
            const boek = options.getString('boek');
            const auteur = options.getString('auteur');
            const status = options.getString('status');
            const eigenaar = options.getString('eigenaar');
            const uitgeleendAan = options.getString('uitgeleend_aan');
            const beschrijving = options.getString('beschrijving');
            const taal = options.getString('taal');
            const frontCover = options.getString('front_cover');
            const backCover = options.getString('back_cover');
            const aantalBladzijden = options.getInteger('aantal_bladzijden');
            // Construct Omslag array
            const omslag = [];
            if (frontCover) omslag.push({ url: frontCover });
            if (backCover) omslag.push({ url: backCover });

            console.log('Boek:', boek, 'Auteur:', auteur, 'Status:', status, 'Eigenaar:', eigenaar, 'Uitgeleend aan:', uitgeleendAan, 'Beschrijving:', beschrijving, 'Taal:', taal, 'Omslag:', omslag, 'Aantal bladzijden:', aantalBladzijden);

            try {
                const response = await addBookToAirtable(boek, auteur, status, eigenaar, uitgeleendAan, beschrijving, taal, frontCover, backCover, aantalBladzijden);
                console.log('Airtable response:', response);
                await interaction.reply({ content: response, ephemeral: true });  // Make it visible only to the user
            } catch (error) {
                console.error('Error adding data to Airtable:', error);
                await interaction.reply({ content: 'Kan data niet ophalen uit de database.', ephemeral: true });
            }
        } else if (commandName === 'toon_bibliotheek') {
            console.log('toon_bibliotheek command received');
            try {
                const embeds = await fetchLibraryDataCompact();
                if (embeds.length === 0) {
                    await interaction.reply({ content: 'De bibliotheek is leeg.', ephemeral: true });
                } else {
                    // Reply with the first embed and send follow-ups for others if necessary
                    await interaction.reply({ embeds: [embeds[0]], ephemeral: true });
                    for (let i = 1; i < embeds.length; i++) {
                        await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
                    }
                }
            } catch (error) {
                console.error('Error fetching data from Airtable:', error);
                await interaction.reply({ content: 'Kan data niet ophalen uit de database.', ephemeral: true });
            }
        }
        else if (commandName === 'zoek_boek') {
            console.log('zoek_boek command received');
        
            const boek = options.getString('boek');
            const auteur = options.getString('auteur');
            const status = options.getString('status');
            const eigenaar = options.getString('eigenaar');
            const uitgeleendAan = options.getString('uitgeleend_aan');
            const taal = options.getString('taal');
        
            console.log('Searching with parameters:', { boek, auteur, status, eigenaar, uitgeleendAan, taal });
        
            // Ensure at least one parameter is provided
            if (!boek && !auteur && !status && !eigenaar && !uitgeleendAan && !taal) {
                await interaction.reply({ content: 'Je moet minimaal één parameter invullen om te zoeken.', ephemeral: true });
                return;
            }
        
            try {
                const embeds = await searchBook({ boek, auteur, status, eigenaar, uitgeleendAan, taal });
        
                if (embeds.length === 0) {
                    await interaction.reply({ content: 'Geen boeken gevonden met de opgegeven criteria.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Hier zijn de gevonden boeken:', ephemeral: true });
                    for (const embed of embeds) {
                        await interaction.followUp({ embeds: [embed], ephemeral: true });
                    }
                }
            } catch (error) {
                console.error('Error searching for book:', error);
                await interaction.reply({ content: 'Er is een fout opgetreden bij het zoeken naar boeken.', ephemeral: true });
            }
        }
        else if (commandName === 'update_boek_status') {
            try {
                console.log('Received update_book_status command');
        
                const boek = options.getString('boek');
                const status = options.getString('status');
                const uitgeleendAan = options.getString('uitgeleend_aan');
        
                // Defer the reply to give Discord more time
                await interaction.deferReply({ ephemeral: true });
        
                // If status is 'Uitgeleend', check if 'uitgeleend_aan' is provided
                if (status === 'Uitgeleend' && !uitgeleendAan) {
                    await interaction.editReply({ content: 'Voor de status "Uitgeleend" moet je opgeven aan wie het boek is uitgeleend.', ephemeral: true });
                    return;
                }
        
                // Call the update function for the book's status
                const response = await updateBookStatus(boek, status, uitgeleendAan);
                
                // Send the success message back
                await interaction.editReply({ content: response, ephemeral: true });
            } catch (error) {
                console.error('Error handling update_book_status command:', error);
                await interaction.editReply({ content: 'Er is een onverwachte fout opgetreden bij het verwerken van het commando.', ephemeral: true });
            }
        }
        else  if (commandName === 'help') {
            console.log('help command received');
            
            // Create an embed message with a list of available commands and their descriptions
            const helpEmbed = {
                color: 0x0099ff,
                title: 'Beschikbare Commando\'s',
                description: 'Hier is een lijst van alle beschikbare commando\'s in de bot, met uitleg over wat ze doen:',
                fields: [
                    {
                        name: '/boek_toevoegen',
                        value: 'Voeg een nieuw boek toe aan de verbondsbibliotheek. Je kunt details zoals de titel, auteur, status en eigenaar invullen.',
                    },
                    {
                        name: '/toon_bibliotheek',
                        value: 'Toon een lijst van alle boeken in de verbondsbibliotheek.',
                    },
                    {
                        name: '/zoek_boek',
                        value: 'Zoek een boek op basis van verschillende filters zoals titel, auteur, status en meer.',
                    },
                    {
                        name: '/update_boek_status',
                        value: 'Werk de status van een boek bij. Je kunt het boek als "Beschikbaar" of "Uitgeleend" markeren.',
                    },
                    {
                        name: '/help',
                        value: 'Toon deze lijst met beschikbare commando\'s.',
                    },
                ],
                footer: {
                    text: 'Voor hulp met specifieke commando\'s, gebruik /help [commando]',
                },
            };

            await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        }            
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Er is een onverwachte fout opgetreden bij het verwerken van het commando.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Er is een onverwachte fout opgetreden bij het verwerken van het commando.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
