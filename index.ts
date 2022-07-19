import express, {Express, Request, Response} from 'express';
import dotenv from 'dotenv';
import screenshot from 'screenshot-desktop';
import path from 'path';
import {ImageAnnotatorClient} from '@google-cloud/vision';
import {ClientOptions} from 'google-gax/build/src/clientInterface';
import * as fs from 'fs';
import {v4} from 'uuid';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5001;

// gcp JSON key
// the key from another project because I have ploblems with billing settings
// this is not in .gitignore for your comfortability
const CREDENTIALS = JSON.parse(JSON.stringify(
    {
        "type": "service_account",
        "project_id": "int-map-334413",
        "private_key_id": "b1db51f3fd0188c817d0e8e9d693923b66356f51",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4SsYY4MCrM43/\nlBmT0zqNIwY0N+CVDY/geY8K9gKd0FnOiDzvIhC6RZ2NNF6R7U3hJJon/01t0NHH\n3mob3rtwIINlIf66q8hZQogi74PpsDin5L4fOlHzrJ4JyKzdr7jiQSp7i8D/JFwS\nKOifMQlNEZR/NE4mZZ50ZSImyZ/+sM9gk/wUtzimSTM0hNI5lfg/m5ennvPYbdNA\nMW8ULgCRr/1sV8pD/MobcPTd9De+R+8yadvr0Ir++8aUnP7d2vacUWlUAaxOaEqF\nhc2fntWTDavfsCSoxrnNMzr6ZijjUYWTw5vxc48ZHV/j7ade2KTvkwY+Q3ZZxOti\niEL2O9krAgMBAAECggEAJ4nfU2IQ5AolCnLPRABa/QHJKHXeiIwG1L2vu0XJjOsx\nAVcIX7O6zAP4h9129q7neQi9zBwBlDBreYqV0FHqe+V120I+YPVPABt+kqQ5dG8a\n0KaKRa/g+jsMEwRLViqHq38YqrXym6rE2B6Pveuq166QYfQqWiGOK+GwwIqceWs/\nFTVygUUtNvGvXCQqtb1NbOh4/PbLq81+F15USowYPuuLWwNzPFcx7CF3vvUeSYH6\ntS8q2sQRLTQ727RZybMGMrIuMwG+K25ZMl8i9kOjQRSZtMNtp6xMzWzPK9rVGPOX\nLrt3zv3AHQ1okWFXx1q0BpCE1Tfg1TtyNrXCeTjJbQKBgQDtyeEhoZwJV7yXJJ9C\nZPC2kLJ5sDIsbnwnyNg45V8AcIKKe5g203tLAME9rzv993dNQNom74InQqn77zBl\nTUt5g8iTUtHkuXmYGXf7Xg/bqgT2JQKY+0wL6Aa6rIoBsC3SShpfl26MeH7KJ4N8\nfntCIl1nwdx6jzLjQl87qT9Y9QKBgQDGaAiRcc9oSus1NGIVG5ty90IUGXUyfylN\npdwbs/VuIt/mdDKTfSI5MUGJtjgGh9dR22MwqHbYv06dAundSOtTqWandsvIiyen\nxFfKWNDwoTy7M/GDktyBkOszLRiqQgeFw6eRrf1FNtFoW9r3XXmJRKfoELssBQvd\ndrU4JomVnwKBgCK1WvUrv7jlY5O0NsLcNP6Q9FwqycgOgHTWLilv4YQQ6B0KmVc3\nW0HBZHN6hok1e+Z81trkDt1oL6OkcC35MFEWWUqXxidao1L+NLMuMaZglMTQ9iYa\nWClMvt60nJhOfQG660qUsgAy/l7Hkbu0Qo2Oso+YjnQdPtJJN9lfhO2ZAoGASwvM\nud73mbZE02IV+2/u04SM/PdIKiqJH/Ktl9jw65DLaernunvpdwKXjJRdCrNVEYRP\nN3dxRLjP7nnMpcPQJ1v7FTrNB/UCseWFY2dG2M3UH+cc4iyptWRwYnIbU0MYf1Mr\nTeIm24hJmxSrdUdpEi/i5td1RMg/3avqDewdvHcCgYEAm1qqGfbtIToHDNXIHFdn\n/Wok56mixxOYOIshP8+V6SNkS9HELjQ1eATgAhoy+cHKEu7ttCegu6L9nfNxmcpF\nw3FLL94JhG9KG6ZmVC3707siEEz2udZgFOFeuuYxu5ndDcCTPfhPL1D5Spk2g9/i\nPEsKkiU/KR+81tjMRs6Cwe8=\n-----END PRIVATE KEY-----\n",
        "client_email": "text-detector@int-map-334413.iam.gserviceaccount.com",
        "client_id": "118345347512361557529",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/text-detector%40int-map-334413.iam.gserviceaccount.com"
    },
));
const CONFIG: ClientOptions = {
    credentials: {
        private_key: CREDENTIALS.private_key,
        client_email: CREDENTIALS.client_email,
    },
};

const client = new ImageAnnotatorClient(CONFIG);

const getFilePath = (fileName: string, fileType: 'txt' | 'png'): string => path.join(__dirname, '../public/', `${fileName}.${fileType}`);

const makeScreenshot = async (): Promise<Buffer | undefined> => {
    const screenImage = await screenshot();
    console.log('Screenshot created');
    return screenImage;
}

const saveTextFromScreenshot = async (text: string | Buffer): Promise<void> => {
    const filePath = getFilePath(v4(), 'txt');
    fs.appendFile(filePath, text, () => {});
    console.log(`The text from the image is saved in ${filePath}`);
}

app.get('/', async (req: Request, res: Response) => {
    res.send('Make a screenshot');
    const screenImage = await makeScreenshot();

    const [result] = await client.textDetection(screenImage!);
    const text = result?.fullTextAnnotation?.text;
    console.log(`The text from the image is got: ${text}`);

    await saveTextFromScreenshot(text!);
});

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});