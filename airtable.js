require('dotenv').config();
const Airtable = require('airtable');
const { EmbedBuilder } = require('discord.js');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function addBookToAirtable(boek, auteur, status, eigenaar, uitgeleendAan, beschrijving, taal, frontCover, backCover, aantalBladzijden) {
    console.log('Adding data to Airtable:', { boek, auteur, status, eigenaar, uitgeleendAan, beschrijving, taal, frontCover, backCover });

    try {
        // Check if status is 'Beschikbaar' and uitgeleendAan is filled in
        if (status === 'Beschikbaar' && uitgeleendAan) {
            return 'Een boek dat beschikbaar is kan niet uitgeleend zijn aan iemand.';
        }

        // Check if status is 'Uitgeleend' and uitgeleendAan is empty
        if (status === 'Uitgeleend' && !uitgeleendAan) {
            return 'Vul het veld >uitgeleend_aan< in met de naam van de persoon waar je het boek aan hebt geleend.';
        }

        const records = await base('verbondsbibliotheek').select({
            filterByFormula: `{Boek} = '${boek}'`
        }).firstPage();

        if (records.length > 0) {
            return `'${boek}' bestaat al in de bibliotheek!`;
        }

        // Prepare the Omslag array with front and back covers if provided
        const omslag = [];
        if (frontCover) omslag.push({ url: frontCover });
        if (backCover) omslag.push({ url: backCover });

        // Add the book
        await base('verbondsbibliotheek').create({
            'Boek': boek,
            'Auteur': auteur,
            'Status': status,
            'Eigenaar': eigenaar,
            'Uitgeleend aan': uitgeleendAan, // This value will be null if status is 'Beschikbaar'
            'Beschrijving': beschrijving,
            'Taal': taal,
            'Omslag': omslag,
            'Aantal bladzijden': aantalBladzijden
        });
        return `'${boek}' is succesvol toegevoegd aan de bibliotheek!`;
    } catch (error) {
        if (error.statusCode === 422) {
            return `Eigenaar '${eigenaar}' kan niet worden toegevoegd.`;
        }
        console.error('Airtable error:', error);
        return 'Kan boek niet toevoegen aan de database.';
    }
}

async function fetchLibraryDataCompact() {
    try {
        const records = await base('verbondsbibliotheek').select().all();

        // Create a compact list of books with basic information
        let bookList = records.map(record => {
            const fields = record.fields;
            const boek = fields.Boek || 'Onbekend Boek';
            const auteur = fields.Auteur || 'Onbekende Auteur';
            const status = fields.Status || 'Onbekend';

            // Format each book's information
            return `**${boek}**\n**Auteur**: ${auteur}\n**Beschikbaarheid**: ${status}\n`;
        });

        // Join all book info into one large string (with line breaks between each)
        const bookInfoString = bookList.join('\n');

        // If the list of books is too long, split them into multiple embeds
        const maxEmbedLength = 2000; // Discord's message character limit
        let embeds = [];
        let partNumber = 1; // Start from Deel 1
        const thumbnailUrl = 'https://scontent-bru2-1.xx.fbcdn.net/v/t39.30808-6/352234944_2153332354857911_6221230371478192896_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=OGgJhWH2aK0Q7kNvgG-sndw&_nc_zt=23&_nc_ht=scontent-bru2-1.xx&_nc_gid=ALkMazRJ2iKfDtje-aOwr6K&oh=00_AYBXYazxLMu7H3Ab9d-RElX3Y6Ln3dFwrrie6NNMkE8jxA&oe=679C1EDC';

        while (bookInfoString.length > maxEmbedLength) {
            let part = bookInfoString.slice(0, maxEmbedLength);
            bookInfoString = bookInfoString.slice(maxEmbedLength);

            embeds.push({
                title: `Bibliotheek (Deel ${partNumber})`,
                description: part,
                color: 0x0099ff,
                thumbnail: { url: thumbnailUrl },
                footer: { text: 'Verbondsbibliotheek' },
            });

            partNumber++;
        }

        // Add remaining part if there's any left
        if (bookInfoString.length > 0) {
            embeds.push({
                title: `Bibliotheek (Deel ${partNumber})`,
                description: bookInfoString,
                color: 0x0099ff,
                thumbnail: { url: thumbnailUrl },
                footer: { text: 'Verbondsbibliotheek' },
            });
        }

        return embeds;
    } catch (error) {
        console.error('Error fetching data from Airtable:', error);
        throw new Error('Kan data niet ophalen uit de database.');
    }
}


async function searchBook(criteria) {
    console.log('Searching books with criteria:', criteria);

    try {
        // Map camelCase keys to Airtable field names
        const fieldMapping = {
            boek: 'Boek',
            auteur: 'Auteur',
            status: 'Status',
            eigenaar: 'Eigenaar',
            uitgeleendAan: 'Uitgeleend aan',
            taal: 'Taal'
        };

        // Build the filterByFormula dynamically based on the provided criteria
        const filters = Object.entries(criteria)
            .filter(([_, value]) => value) // Only include fields with values
            .map(([key, value]) => {
                // Map the key to the Airtable field name
                const fieldName = fieldMapping[key];
                if (!fieldName) {
                    throw new Error(`Unknown search criterion: ${key}`);
                }

                // Use the SEARCH function for partial matching, and make it case-insensitive
                return `SEARCH('${value.toLowerCase()}', LOWER({${fieldName}}))`;
            })
            .join(' AND ');

        console.log('FilterByFormula:', filters);

        const records = await base('verbondsbibliotheek').select({
            filterByFormula: filters
        }).firstPage();

        if (records.length === 0) {
            return []; // No matches
        }

        // Prepare embeds for all matching records
        return records.map(record => {
            const fields = record.fields;

            // Extract images if they exist
            const images = fields.Omslag || [];
            const thumbnail = images.length > 0 ? images[0]?.url : null; // First image is the front cover
            const mainImage = images.length > 1 ? images[1]?.url : null; // Second image is the back cover

            return {
                title: fields.Boek || 'Onbekend Boek',
                description: fields.Beschrijving || '',
                fields: [
                    { name: 'Auteur', value: fields.Auteur || 'Onbekend', inline: true },
                    { name: 'Status', value: fields.Status || 'Onbekend', inline: true },
                    { name: 'Eigenaar', value: fields.Eigenaar || 'Onbekend', inline: true },
                    { name: 'Uitgeleend aan', value: fields['Uitgeleend aan'] || 'Niemand', inline: true },
                    { name: 'Taal', value: fields.Taal || 'Onbekend', inline: true }
                ],
                thumbnail: thumbnail ? { url: thumbnail } : null, // Front cover as thumbnail
                image: mainImage ? { url: mainImage } : null, // Back cover as main image
                color: 0x0099ff,
                footer: { text: 'Verbondsbibliotheek' },
                timestamp: new Date().toISOString()
            };
        });
    } catch (error) {
        console.error('Error searching books:', error);
        throw new Error('Kan data niet ophalen uit de database.');
    }
}

async function updateBookStatus(boek, status, uitgeleendAan = null) {
    console.log('updateBookStatus called with:', { boek, status, uitgeleendAan });

    try {
        // Check if status is 'Beschikbaar' and uitgeleendAan is filled in
        if (status === 'Beschikbaar' && uitgeleendAan) {
            return 'Een boek dat beschikbaar is kan niet uitgeleend zijn aan iemand.';
        }

        // Check if status is 'Uitgeleend' and uitgeleendAan is empty
        if (status === 'Uitgeleend' && !uitgeleendAan) {
            return 'Vul het veld uitgeleend_aan met de naam van de persoon waar je het boek aan hebt geleend.';
        }

        // Check for valid status
        if (!['Beschikbaar', 'Uitgeleend'].includes(status)) {
            console.log(`Invalid status: ${status}`);
            return `Ongeldige status: '${status}'. Status moet 'Beschikbaar' of 'Uitgeleend' zijn.`;
        }

        // Fetch records for the book with case-insensitive search
        console.log(`Fetching records for boek: ${boek}`);
        const records = await base('verbondsbibliotheek').select({
            filterByFormula: `LOWER({Boek}) = '${boek.toLowerCase()}'`
        }).firstPage();

        console.log(`Records fetched for boek '${boek}':`, records.length); // Log number of records
        if (records.length === 0) {
            console.log(`No records found for boek: ${boek}`);
            return `Boek '${boek}' is niet gevonden in de bibliotheek.`;
        }

        const recordId = records[0].id;
        console.log(`Record ID for boek '${boek}': ${recordId}`);

        // Validation for 'uitgeleend_aan'
        if (status === 'Uitgeleend' && !uitgeleendAan) {
            console.log('Validation failed: "uitgeleend_aan" is required for status "Uitgeleend".');
            return 'Vul het veld >uitgeleend_aan< in met de naam van de persoon waar je het boek aan hebt geleend.';
        }

        // Prepare fields for update
        const updatedFields = {
            Status: status,
            'Uitgeleend aan': status === 'Uitgeleend' ? uitgeleendAan : null
        };
        console.log('Updating fields in Airtable:', updatedFields);

        // Update the record
        const result = await base('verbondsbibliotheek').update(recordId, updatedFields);
        console.log('Airtable update result:', result);

        return `De status van '${boek}' is succesvol bijgewerkt naar '${status}'${status === 'Uitgeleend' ? ` (uitgeleend aan ${uitgeleendAan})` : ''}.`;
    } catch (error) {
        console.error('Error in updateBookStatus:', error);
        throw new Error('Er is een fout opgetreden bij het bijwerken van de status van het boek.');
    }
}

module.exports = { addBookToAirtable, fetchLibraryDataCompact, searchBook, updateBookStatus };
