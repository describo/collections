import { demandAuthenticatedUser } from "../common/index.js";

import models from "../models/index.js";
import defaultProfile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
import lodashPkg from "lodash";
const { cloneDeep } = lodashPkg;

// export async function generateProfile() {
//     let etypes = [
//         {
//             name: "Entity",
//             properties: [
//                 ["organisationCode", ["Text"]],
//                 ["subName", ["Text"]],
//                 ["legalNumber", ["Text"]],
//                 ["startDate", ["Text"]],
//                 ["startDateModifier", ["Text"]],
//                 ["startDateISOString", ["Date"]],
//                 ["endDate", ["Text"]],
//                 ["endDateModifier", ["Text"]],
//                 ["endDateISOString", ["Text"]],
//                 ["dateQualifier", ["Text"]],
//                 ["legalStatus", ["Text"]],
//                 ["function", ["Function"]],
//                 ["summaryNote", ["TextArea"]],
//                 ["fullNote", ["TextArea"]],
//                 ["gender", ["Text"]],
//                 ["reference", ["Text"]],
//                 ["processingNotes", ["TextArea"]],
//                 ["recordAppendDate", ["Date"]],
//                 ["recordLastModified", ["Date"]],
//                 ["logo", ["Text"]],
//                 ["online", ["Text"]],
//                 ["gallery", ["Text"]],
//                 ["owner", ["Person"]],
//                 ["rating", ["Text"]],
//                 ["status", ["Text"]],
//                 ["preparedBy", ["Organisation"]],
//                 ["birthPlace", ["Place"]],
//                 ["birthState", ["State"]],
//                 ["birthCountry", ["Country"]],
//                 ["deathPlace", ["Place"]],
//                 ["deathState", ["State"]],
//                 ["deathCountry", ["Country"]],
//                 ["nationality", ["Nationality"]],
//             ],
//         },
//         {
//             name: "DigitalObject",
//             properties: [
//                 ["startDate", ["Text"]],
//                 ["startDateModifier", ["Text"]],
//                 ["startDateISOString", ["Date"]],
//                 ["endDate", ["Text"]],
//                 ["endDateModifier", ["Text"]],
//                 ["endDateISOString", ["Text"]],
//                 ["physicalDescription", ["TextArea"]],
//                 ["resourceCreator", ["Person"]],
//                 ["controlCode", ["Text"]],
//                 ["note", ["TextArea"]],
//                 ["objectIPRights", ["TextArea"]],
//                 ["processingNotes", ["TextArea"]],
//                 ["outputStatus", ["Text"]],
//                 ["recordAppendDate", ["Date"]],
//                 ["recordLastModified", ["Date"]],
//                 ["place", ["Place"]],
//                 ["hasFile", ["File", "DigitalObjectVersion"]],
//                 ["linkedArchivalResource", ["ArchiveResource", "HeritageResource"]],
//                 ["linkedPublishedResource", ["PublishedResource"]],
//             ],
//         },
//         {
//             name: "DigitalObjectVersion",
//             subClassOf: ["DigitalObject"],
//             properties: [
//                 ["format", ["Text"]],
//                 ["primaryVersion", ["DigitalObject"]],
//                 ["imageOrientation", ["Text"]],
//             ],
//         },
//         {
//             name: "Function",
//             properties: [
//                 ["startDate", ["Text"]],
//                 ["startDateModifier", ["Text"]],
//                 ["startDateISOString", ["Date"]],
//                 ["endDate", ["Text"]],
//                 ["endDateModifier", ["Text"]],
//                 ["endDateISOString", ["Text"]],
//                 ["dateQualifier", ["Text"]],
//                 ["recordAppendDate", ["Date"]],
//                 ["recordLastModified", ["Date"]],
//             ],
//         },
//         {
//             name: "ArchivalResource",
//             properties: [
//                 ["repositoryId", ["Text"]],
//                 ["archiveIdentifier", ["Text"]],
//                 ["archiveLink", ["Text", "URL"]],
//                 ["resourceLanguage", ["Language"]],
//                 ["startDate", ["Text"]],
//                 ["startDateModifier", ["Text"]],
//                 ["startDateISOString", ["Date"]],
//                 ["endDate", ["Text"]],
//                 ["endDateModifier", ["Text"]],
//                 ["endDateISOString", ["Text"]],
//                 ["linearMetres", ["Text"]],
//                 ["numberOfItems", ["Number"]],
//                 ["typeOfItems", ["Text"]],
//                 ["formatOfItems", ["Text"]],
//                 ["accessConditions", ["TextArea"]],
//                 ["organisationalIdentifier", ["Text"]],
//                 ["recordCreationDate", ["Date"]],
//                 ["recordLastModifiedDate", ["Date"]],
//                 ["resourceCreator", ["Person"]],
//                 ["levelOfCollection", ["Text"]],
//                 ["processingNote", ["TextArea"]],
//                 ["outputStatus", ["TextArea"]],
//                 ["preparedBy", ["Person"]],
//             ],
//         },
//         {
//             name: "ArchiveResource",
//             subClassOf: ["ArchivalResource"],
//             properties: [],
//         },
//         {
//             name: "HeritageResource",
//             subClassOf: ["ArchivalResource"],
//             properties: [],
//         },
//         {
//             name: "PublishedResource",
//             properties: [
//                 ["online", ["Text"]],
//                 ["author", ["Person"]],
//                 ["secondaryAuthor", ["Person"]],
//                 ["publicationYear", ["Text"]],
//                 ["secondaryTitle", ["Text"]],
//                 ["publisher", ["Organization"]],
//                 ["volume", ["Text"]],
//                 ["numberOfVolumes", ["Number"]],
//                 ["number", ["Number"]],
//                 ["numberOfPages", ["Number"]],
//                 ["edition", ["Text"]],
//                 ["publicationDate", ["Date"]],
//                 ["isbn_issn", ["Text"]],
//                 ["referenceSource", ["Text"]],
//                 ["abstract", ["TextArea"]],
//                 ["notes", ["TextArea"]],
//                 ["classification", ["Text"]],
//                 ["url", ["URL"]],
//                 ["urlType", ["Text"]],
//                 ["dateAccessed", ["Date"]],
//                 ["format", ["Text"]],
//                 ["contentLanguage", ["Language"]],
//                 ["contains", ["TextArea"]],
//                 ["recordAppendDate", ["Date"]],
//                 ["recordLastModified", ["Date"]],
//                 ["descriptionOfWork", ["Date"]],
//                 ["catalogueId", ["Text"]],
//                 ["processingNotes", ["TextArea"]],
//                 ["outputStatus", ["Text"]],
//             ],
//         },
//         {
//             name: "Relationship",
//             properties: [
//                 ["source", ["ANY_ENTITY"]],
//                 ["target", ["ANY_ENTITY"]],
//                 ["description", ["TextArea"]],
//                 ["startDate", ["Text"]],
//                 ["startDateModifier", ["Text"]],
//                 ["startDateISOString", ["Date"]],
//                 ["endDate", ["Text"]],
//                 ["endDateModifier", ["Text"]],
//                 ["endDateISOString", ["Text"]],
//                 ["dateQualifier", ["Text"]],
//                 ["recordAppendDate", ["Date"]],
//                 ["recordLastModified", ["Date"]],
//                 ["processingNotes", ["TextArea"]],
//                 ["relationshipStrength", ["Text"]],
//                 ["place", ["Place"]],
//             ],
//         },
//         {
//             name: "EntityArchivalResourceRelationship",
//             subClassOf: ["Relationship"],
//             properties: [["citation", ["TextArea"]]],
//         },
//         {
//             name: "EntityDigitalObjectRelationship",
//             subClassOf: ["Relationship"],
//             properties: [["citation", ["TextArea"]]],
//         },
//         {
//             name: "EntityFunctionRelationship",
//             subClassOf: ["Relationship"],
//             properties: [["rating", ["Text"]]],
//         },
//     ];

//     let profile = {
//         metadata: {
//             name: "OHRM Default Profile",
//             description: "A default OHRM profile for Describo Collections",
//             version: 0.1,
//             warnMissingProperty: true,
//         },
//         context: [
//             "https://w3id.org/ro/crate/1.1/context",
//             { ohrm: "http://ohrm.ontology.somewhere" },
//         ],
//         classes: {},
//         lookup: {
//             Language: {
//                 fields: [
//                     "@id",
//                     "name",
//                     "alternateName",
//                     "iso639-3",
//                     "austlangCode",
//                     "glottologCode",
//                     "languageCode",
//                 ],
//                 datapacks: [],
//             },
//         },
//     };
//     etypes.forEach((type) => {
//         profile.classes[type.name] = {
//             definition: type.definition ?? "override",
//             subClassOf: type.subClassOf ?? [],
//             inputs: type.properties.map((p) => ({
//                 id: `ohrm:${p[0]}`,
//                 name: p[0],
//                 help: "",
//                 type: p[1],
//             })),
//         };
//     });

//     await writeJSON("/srv/configuration/profiles/ohrm-default-profile.json", profile, {
//         spaces: 2,
//     });
// }

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    // fastify.get("/collections", getCollectionsHandler);
    fastify.get("/profile/default", getDefaultProfileHandler);
    fastify.get("/profile/:collectionId", getProfileHandler);
    fastify.post("/profile/:collectionId", postProfileHandler);
    done();
}

// TODO: this code does not have tests yet
async function getDefaultProfileHandler(req) {
    return { profile: cloneDeep(defaultProfile) };
}

// TODO: this code does not have tests yet
async function getProfileHandler(req) {
    const { collectionId } = req.params;
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    let types = await models.type.findAll({
        where: { collectionId },
        attributes: ["name"],
        raw: true,
    });
    let profile = collection.profile ?? cloneDeep(defaultProfile);
    types = types.map((type) => type.name);
    types = types.sort();
    types.forEach((type) => {
        if (!profile.classes[type]) {
            profile.classes[type] = {
                definition: "override",
                subClassOf: ["Entity"],
                inputs: [],
            };
        }
    });
    return { profile };
}

// TODO: this code does not have tests yet
async function postProfileHandler(req) {
    const { collectionId } = req.params;
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    collection.profile = req.body.profile;
    await collection.save();
    return {};
}
