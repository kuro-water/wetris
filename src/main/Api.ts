import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { AiWetrisCore } from "./AiWetrisCore";
import { BrowserWindow } from "electron";

export class Api {
    private server;
    private game: AiWetrisCore;
    private getWindow: () => BrowserWindow;

    constructor(getWindow: () => BrowserWindow) {
        this.getWindow = getWindow;
        this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
            this.handleRequest(req, res);
        });
        this.game = new AiWetrisCore();
    }

    public start(port = 3001): void {
        this.server.listen(port, "127.0.0.1", () => {
            console.log(`API: http://127.0.0.1:${port}`);
        });
    }

    public stop(): void {
        this.server.close();
    }

    private draw(): void {
        const window = this.getWindow();

        window?.webContents.send("drawField", 1, this.game.field.field);
    }

    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        if (req.method === "POST" && req.url === "/reset") {
            this.reset(res);
            return;
        }

        if (req.method === "POST" && req.url === "/step") {
            await this.step(req, res);
            return;
        }

        if (req.method === "GET" && req.url === "/candidates") {
            this.candidates(res);
            return;
        }

        this.sendJson(res, 404, {
            error: "Not Found",
        });
    }

    private reset(res: ServerResponse): void {
        this.game = new AiWetrisCore();
        const candidates = this.game.getCandidates();
        const gameover = this.game.currentMino === null;
        this.draw();
        this.sendJson(res, 200, { gameover: gameover, candidates });
    }

    private async step(req: IncomingMessage, res: ServerResponse): Promise<void> {
        if (this.game === null) {
            this.sendJson(res, 400, {
                error: "Game has not been initialized. Call /reset first.",
            });
            return;
        }

        try {
            const body = await this.readJson(req);
            const actions = body.actions;
            this.game.executeActions(actions);
            this.draw();

            const gameover = this.game.currentMino === null;
            const candidates = this.game.getCandidates();
            this.sendJson(res, 200, { gameover: gameover, candidates });
        } catch (error) {
            this.sendJson(res, 400, {
                error: "Invalid request",
            });
        }
    }

    private candidates(res: ServerResponse): void {
        if (this.game === null) {
            this.sendJson(res, 400, {
                error: "Game has not been initialized. Call /reset first.",
            });
            return;
        }
        const candidates = this.game.getCandidates();
        const gameover = this.game.currentMino === null;
        this.sendJson(res, 200, { gameover: gameover, candidates });
    }

    private readJson(req: IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            let body = "";

            req.on("data", (chunk) => {
                body += chunk;
            });

            req.on("end", () => {
                try {
                    resolve(JSON.parse(body));
                } catch {
                    reject(new Error("Invalid JSON"));
                }
            });

            req.on("error", reject);
        });
    }

    private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
    }
}
