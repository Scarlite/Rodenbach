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
            const categorie1 = options.getString('categorie_1'); // First category
            const categorie2 = options.getString('categorie_2'); // Second category
            const thema = options.getString('thema'); // New field
            
            // Construct Omslag array
            const omslag = [];
            if (frontCover) omslag.push({ url: frontCover });
            if (backCover) omslag.push({ url: backCover });
            
            // Combine categorie1 and categorie2 into a single array if they exist
            const categorieArray = [];
            if (categorie1) categorieArray.push(categorie1.trim());
            if (categorie2) categorieArray.push(categorie2.trim());
        
            console.log('Boek:', boek, 'Auteur:', auteur, 'Status:', status, 'Eigenaar:', eigenaar, 'Uitgeleend aan:', uitgeleendAan, 'Beschrijving:', beschrijving, 'Taal:', taal, 'Omslag:', omslag, 'Aantal bladzijden:', aantalBladzijden, 'Categorieën:', categorieArray, 'Thema:', thema);
        
            try {
                // Defer the reply to allow time for processing
                await interaction.deferReply();
        
                const response = await addBookToAirtable(boek, auteur, status, eigenaar, uitgeleendAan, beschrijving, taal, frontCover, backCover, aantalBladzijden, categorieArray, thema);
                console.log('Airtable response:', response);
        
                // Reply after the operation is done
                await interaction.editReply({ content: response, flags: 64 });  // Using flags instead of ephemeral
            } catch (error) {
                console.error('Error adding data to Airtable:', error);
                await interaction.editReply({ content: 'Kan data niet ophalen uit de database.', flags: 64 });
            }
        }
        else if (commandName === 'toon_bibliotheek') {
            console.log('toon_bibliotheek command received');
            try {
                const categorie = interaction.options.getString('categorie') || null;
                const taal = interaction.options.getString('taal') || null;
                const auteur = interaction.options.getString('auteur') || null; // NEW: Fetch author parameter
        
                const embeds = await fetchLibraryDataCompact(categorie, taal, auteur); // Pass 'auteur' to function
        
                if (embeds.length === 0) {
                    await interaction.reply({ content: 'Geen boeken gevonden met de opgegeven filters.', ephemeral: true });
                } else {
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
            
            // Defer the interaction reply to avoid timeouts
            await interaction.deferReply({ ephemeral: true });
        
            const boek = options.getString('boek');
            const auteur = options.getString('auteur');
            const status = options.getString('status');
            const eigenaar = options.getString('eigenaar');
            const uitgeleendAan = options.getString('uitgeleend_aan');
            const taal = options.getString('taal');
            const categorie = options.getString('categorie'); // Added Categorie
        
            console.log('Searching with parameters:', { boek, auteur, status, eigenaar, uitgeleendAan, taal, categorie });
        
            // Ensure at least one parameter is provided
            if (!boek && !auteur && !status && !eigenaar && !uitgeleendAan && !taal && !categorie) {
                await interaction.editReply({
                    content: 'Je moet minimaal één parameter invullen om te zoeken.',
                });
                return;
            }
        
            try {
                const embeds = await searchBook({ boek, auteur, status, eigenaar, uitgeleendAan, taal, categorie });
        
                if (embeds.length === 0) {
                    // Update the deferred reply with a message if no books are found
                    await interaction.editReply({
                        content: 'Geen boeken gevonden met de opgegeven criteria.',
                    });
                } else {
                    // Edit the deferred reply with a summary message
                    await interaction.editReply({
                        content: 'Hier zijn de gevonden boeken:',
                    });
        
                    // Follow up with additional embeds for each book
                    for (const embed of embeds) {
                        await interaction.followUp({ embeds: [embed], ephemeral: true });
                    }
                }
            } catch (error) {
                console.error('Error searching for book:', error);
        
                // Update the deferred reply with an error message
                await interaction.editReply({
                    content: 'Er is een fout opgetreden bij het zoeken naar boeken.',
                });
            }
        }                 
        else if (commandName === 'update_boek_status') {
            try {
                console.log('Received update_book_status command');
        
                const boek = options.getString('boek');
                const status = options.getString('status');
                const uitgeleendAan = options.getString('uitgeleend_aan');
        
                await interaction.deferReply({ ephemeral: true });
        
                if (status === 'Uitgeleend' && !uitgeleendAan) {
                    await interaction.editReply({ content: 'Voor de status "Uitgeleend" moet je opgeven aan wie het boek is uitgeleend.', ephemeral: true });
                    return;
                }
        
                const response = await updateBookStatus(boek, status, uitgeleendAan);
                
                await interaction.editReply({ content: response, ephemeral: true });
            } catch (error) {
                console.error('Error handling update_book_status command:', error);
                await interaction.editReply({ content: 'Er is een onverwachte fout opgetreden bij het verwerken van het commando.', ephemeral: true });
            }
        }
        else  if (commandName === 'help') {
            console.log('help command received');
            
            const helpEmbed = {
                color: 0x0099ff,
                title: 'Beschikbare Commando\'s',
                description: 'Hier is een lijst van alle beschikbare commando\'s in de bot, met uitleg over wat ze doen:',
                fields: [
                    {
                        name: '/boek_toevoegen',
                        value: 'Voeg een nieuw boek toe aan de verbondsbibliotheek. boek, auteur, status en eigenaar zijn vereiste parameters. De anderen zijn optioneel.',
                    },
                    {
                        name: '/toon_bibliotheek',
                        value: 'Doorzoek het aanbod van de verbondsbibliotheek. Je kan hier drie optionele parameters (inclusief sleutelwoorden) meegeven om de zoekopdracht specifieker te maken. Je kan het commando ingeven zonder parameters om heel de bibliotheek te laten zien. Als een bepaald boek je interesseert kan je de details opzoeken met /zoek_boek.',
                    },
                    {
                        name: '/zoek_boek',
                        value: 'Zoek de details van een boek op doormiddel van verschillende filters zoals titel, auteur, status en meer. Je kan ook zoeken op sleutelwoorden. Je hoeft hier dus niet de volledige titel ingeven.',
                    },
                    {
                        name: '/update_boek_status',
                        value: 'Werk de status van een boek bij. Je kunt het boek als "Beschikbaar" of "Uitgeleend" markeren. Vul steeds het uitgeleend_aan parameter in als je de status veranderd naar "uitgeleend".',
                    },
                    {
                        name: '/help',
                        value: 'Toon deze lijst met beschikbare commando\'s.',
                    },
                ],
                footer: {
                    text: 'Voor meer hulp, stel je vraag aan Opinel.',
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
