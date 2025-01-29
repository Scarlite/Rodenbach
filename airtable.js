require('dotenv').config();
const Airtable = require('airtable');
const { EmbedBuilder } = require('discord.js');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function addBook(boek, auteur, status, eigenaar, uitgeleendAan, beschrijving, taal, frontCover, backCover, aantalBladzijden, categorieArray, thema) {
    console.log('Adding data to Airtable:', { boek, auteur, status, eigenaar, uitgeleendAan, beschrijving, taal, frontCover, backCover, categorieArray, thema });

    try {
        if (status === 'Beschikbaar' && uitgeleendAan) {
            return 'Een boek dat beschikbaar is kan niet uitgeleend zijn aan iemand.';
        }

        if (status === 'Uitgeleend' && !uitgeleendAan) {
            return 'Vul het veld >uitgeleend_aan< in met de naam van de persoon waar je het boek aan hebt geleend.';
        }

        const records = await base('verbondsbibliotheek').select({
            filterByFormula: `{Boek} = '${boek}'`
        }).firstPage();

        if (records.length > 0) {
            return `'${boek}' bestaat al in de bibliotheek!`;
        }

        const omslag = [];
        if (frontCover) omslag.push({ url: frontCover });
        if (backCover) omslag.push({ url: backCover });

        const combinedCategories = Array.isArray(categorieArray) ? categorieArray : [];

        await base('verbondsbibliotheek').create({
            'Boek': boek,
            'Auteur': auteur,
            'Status': status,
            'Eigenaar': eigenaar,
            'Uitgeleend aan': uitgeleendAan,
            'Beschrijving': beschrijving,
            'Taal': taal,
            'Omslag': omslag,
            'Aantal bladzijden': aantalBladzijden,
            'Categorie': combinedCategories,
            'Thema': thema
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

async function fetchLibrary(categorie = null, taal = null, auteur = null) {
    try {
        const records = await base('verbondsbibliotheek').select().all();
        const lowerCategorie = categorie ? categorie.toLowerCase() : null;
        const lowerTaal = taal ? taal.toLowerCase() : null;
        const lowerAuteur = auteur ? auteur.toLowerCase() : null;

        const filteredRecords = records.filter(record => {
            const fields = record.fields;
            const boekCategorie = fields.Categorie 
                ? (Array.isArray(fields.Categorie) 
                    ? fields.Categorie.join(', ').toLowerCase() 
                    : String(fields.Categorie).toLowerCase()) 
                : '';

            const boekTaal = fields.Taal ? String(fields.Taal).toLowerCase() : '';
            const boekAuteur = fields.Auteur ? String(fields.Auteur).toLowerCase() : '';

            const matchesCategorie = !lowerCategorie || boekCategorie.includes(lowerCategorie);
            const matchesTaal = !lowerTaal || boekTaal === lowerTaal;
            const matchesAuteur = !lowerAuteur || boekAuteur.includes(lowerAuteur);

            return matchesCategorie && matchesTaal && matchesAuteur;
        });

        console.log(`Found ${filteredRecords.length} matching books.`);

        filteredRecords.sort((a, b) => (a.fields.Boek || '').localeCompare(b.fields.Boek || ''));

        const bookList = filteredRecords.map(record => {
            const fields = record.fields;
            const boek = fields.Boek || 'Onbekend Boek';
            const auteur = fields.Auteur || 'Onbekende Auteur';
            const status = fields.Status || 'Onbekend';

            return `**${boek}**\n**Auteur**: ${auteur}\n**Beschikbaarheid**: ${status}\n`;
        });

        const maxEmbedLength = 2000;
        const thumbnailUrl =
            'https://scontent-bru2-1.xx.fbcdn.net/v/t39.30808-6/352234944_2153332354857911_6221230371478192896_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=OGgJhWH2aK0Q7kNvgG-sndw&_nc_zt=23&_nc_ht=scontent-bru2-1.xx&_nc_gid=ALkMazRJ2iKfDtje-aOwr6K&oh=00_AYBXYazxLMu7H3Ab9d-RElX3Y6Ln3dFwrrie6NNMkE8jxA&oe=679C1EDC';

        let embeds = [];
        let partNumber = 1;
        let currentDescription = '';
let remainingBooks = [...bookList];

while (remainingBooks.length > 0) {
    let nextBook = remainingBooks.shift();
        if (currentDescription.length + nextBook.length > maxEmbedLength) {
            embeds.push({
                title: `Bibliotheek (Deel ${partNumber})`,
                description: currentDescription,
                color: 0x0099ff,
                thumbnail: { url: thumbnailUrl },
                footer: {
                    text: 'Tip: Als een bepaald boek je interesseert, gebruik dan het zoek_boek commando om meer details te verkrijgen.',
                },
            });

            partNumber++;
            currentDescription = '';
        }

        currentDescription += nextBook + '\n';
    }

    if (currentDescription.length > 0) {
        embeds.push({
            title: `Bibliotheek (Deel ${partNumber})`,
            description: currentDescription,
            color: 0x0099ff,
            thumbnail: { url: thumbnailUrl },
            footer: {
                text: 'Tip: Als een bepaald boek je interesseert, gebruik dan het zoek_boek commando om meer details te verkrijgen.',
            },
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
        const fieldMapping = {
            boek: 'Boek',
            auteur: 'Auteur',
            status: 'Status',
            eigenaar: 'Eigenaar',
            uitgeleendAan: 'Uitgeleend aan',
            taal: 'Taal',
            categorie: 'Categorie',
            aantalBladzijden: 'Aantal bladzijden',
        };

        const filters = Object.entries(criteria)
            .filter(([_, value]) => value)
            .map(([key, value]) => {
                const fieldName = fieldMapping[key];
                if (!fieldName) throw new Error(`Unknown search criterion: ${key}`);

                const escapedValue = value.replace(/'/g, "\\'");

                if (key === "categorie") {
                    return `SEARCH('${escapedValue.toLowerCase()}', LOWER(ARRAYJOIN({${fieldName}}, ', '))) > 0`;
                }

                return `SEARCH('${escapedValue.toLowerCase()}', LOWER({${fieldName}})) > 0`;
            });

        const filterByFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : 'TRUE()';

        console.log('FilterByFormula:', filterByFormula);

        const records = await base('verbondsbibliotheek').select({
            filterByFormula: filterByFormula,
        }).firstPage();

        if (records.length === 0) {
            return [];
        }

        records.sort((a, b) => {
            const titleA = a.fields.Boek ? a.fields.Boek.toLowerCase() : '';
            const titleB = b.fields.Boek ? b.fields.Boek.toLowerCase() : '';
            return titleA.localeCompare(titleB);
        });

        return records.map(record => {
            const fields = record.fields;
            const images = fields.Omslag || [];

            let thumbnail = null;
            let mainImage = null;

            if (images.length === 2) {
                thumbnail = images[0]?.url;
                mainImage = images[1]?.url;
            } else if (images.length === 1) {
                mainImage = images[0]?.url;
            }

            const categorie = fields.Categorie ? fields.Categorie.join(', ') : 'Geen';
            const thema = fields.Thema || 'Geen';
            const aantalBladzijden = fields['Aantal bladzijden'] || 'Onbekend';
            const status = fields.Status || 'Onbekend';
            const uitgeleendAan = fields['Uitgeleend aan'] || 'Niemand';

            const embedFields = [
                { name: 'Auteur', value: fields.Auteur || 'Onbekend', inline: true },
                { name: 'Status', value: status, inline: true },
                { name: 'Eigenaar', value: fields.Eigenaar || 'Onbekend', inline: true },
                { name: 'Taal', value: fields.Taal || 'Onbekend', inline: true },
                { name: 'Categorie', value: categorie, inline: true },
                { name: 'Thema', value: thema, inline: true },
                { name: 'Aantal bladzijden', value: aantalBladzijden, inline: true },
            ];

            if (status !== 'Beschikbaar') {
                embedFields.push({ name: 'Uitgeleend aan', value: uitgeleendAan, inline: true });
            }

            return {
                title: fields.Boek || 'Onbekend Boek',
                description: fields.Beschrijving || '',
                fields: embedFields,
                thumbnail: thumbnail ? { url: thumbnail } : null,
                image: mainImage ? { url: mainImage } : null,
                color: 0x0099ff,
                footer: { text: 'Verbondsbibliotheek' },
                timestamp: new Date().toISOString(),
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
        if (status === 'Beschikbaar' && uitgeleendAan) {
            return 'Een boek dat beschikbaar is kan niet uitgeleend zijn aan iemand.';
        }

        if (status === 'Uitgeleend' && !uitgeleendAan) {
            return 'Vul het veld uitgeleend_aan met de naam van de persoon waar je het boek aan hebt geleend.';
        }

        if (!['Beschikbaar', 'Uitgeleend'].includes(status)) {
            console.log(`Invalid status: ${status}`);
            return `Ongeldige status: '${status}'. Status moet 'Beschikbaar' of 'Uitgeleend' zijn.`;
        }

        console.log(`Fetching records for boek: ${boek}`);
        const records = await base('verbondsbibliotheek').select({
            filterByFormula: `LOWER({Boek}) = '${boek.toLowerCase()}'`
        }).firstPage();

        console.log(`Records fetched for boek '${boek}':`, records.length);
        if (records.length === 0) {
            console.log(`No records found for boek: ${boek}`);
            return `Boek '${boek}' is niet gevonden in de bibliotheek.`;
        }

        const recordId = records[0].id;
        console.log(`Record ID for boek '${boek}': ${recordId}`);

        if (status === 'Uitgeleend' && !uitgeleendAan) {
            console.log('Validation failed: "uitgeleend_aan" is required for status "Uitgeleend".');
            return 'Vul het veld >uitgeleend_aan< in met de naam van de persoon waar je het boek aan hebt geleend.';
        }

        const updatedFields = {
            Status: status,
            'Uitgeleend aan': status === 'Uitgeleend' ? uitgeleendAan : null
        };
        console.log('Updating fields in Airtable:', updatedFields);
        const result = await base('verbondsbibliotheek').update(recordId, updatedFields);
        console.log('Airtable update result:', result);

        return `De status van '${boek}' is succesvol bijgewerkt naar '${status}'${status === 'Uitgeleend' ? ` (uitgeleend aan ${uitgeleendAan})` : ''}.`;
    } catch (error) {
        console.error('Error in updateBookStatus:', error);
        throw new Error('Er is een fout opgetreden bij het bijwerken van de status van het boek.');
    }
}

module.exports = { addBook, fetchLibrary, searchBook, updateBookStatus };
