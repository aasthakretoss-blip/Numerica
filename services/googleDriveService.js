const { google } = require("googleapis");
const path = require("path");

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.SHARED_FOLDER_ID = "1tHScmBEY-QK9Kqe3j2SSDnQudoYKZOxF";
    this.auth = null;
  }

  async initialize() {
    try {
      console.log("🔧 Inicializando Google Drive API...");
      this.auth = new google.auth.GoogleAuth({
        keyFile: path.join(
          __dirname,
          "../config/harvest-c95bd-bb61d9f0db0a.json"
        ),
        scopes: ["https://www.googleapis.com/auth/drive"], // ✅ full access (needed for permissions)
      });

      this.drive = google.drive({ version: "v3", auth: this.auth });
      console.log("✅ Google Drive API inicializada exitosamente");
      return true;
    } catch (error) {
      console.error("❌ Error inicializando Google Drive API:", error.message);
      return false;
    }
  }

  async ensureDriveInitialized() {
    if (!this.drive) {
      console.warn("⚠️ Drive client no inicializado — reinicializando...");
      await this.initialize();
    }
  }

  /** ✅ Makes file public (anyone with link can view) */
  async ensureFileIsPublic(fileId) {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
        });
      console.log(`🌍 Archivo ${fileId} hecho público`);
    } catch (error) {
      if (error.code === 403) {
        console.warn(`⚠️ No se pudo cambiar permisos (403) para ${fileId}`);
      } else if (error.code !== 404) {
        console.error(
          `❌ Error al hacer público el archivo ${fileId}:`,
          error.message
        );
      }
    }
  }

  async listSubfolders() {
    await this.ensureDriveInitialized();
    console.log("📂 Obteniendo lista de subcarpetas...");

    let subfolders = [];
    let pageToken = null;

    try {
      do {
      const response = await this.drive.files.list({
          q: `'${this.SHARED_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'`,
          fields: "nextPageToken, files(id, name)",
          pageToken,
        pageSize: 100,
      });

        subfolders = subfolders.concat(response?.data?.files || []);
        pageToken = response?.data?.nextPageToken || null;
      } while (pageToken);

      console.log(`📁 Total subcarpetas encontradas: ${subfolders.length}`);
      return subfolders;
    } catch (error) {
      console.error("❌ Error listando subcarpetas:", error.message);
      return [];
    }
  }

  async searchInSubfolders(employeeName) {
    await this.ensureDriveInitialized();

      console.log(`🔍 Buscando en subcarpetas para empleado: ${employeeName}`);
    const subfolders = await this.listSubfolders();

    if (!subfolders.length) {
      console.log("⚠️ No se encontraron subcarpetas");
      return { success: true, files: [] };
    }

    // Timeout safeguard
    const timeout = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("⏱️ Timeout buscando en subcarpetas")),
        30000
      )
    );

    const searchPromise = Promise.all(
      subfolders.map(async (subfolder) => {
        try {
          const query = `'${subfolder.id}' in parents and mimeType='application/pdf' and name contains '${employeeName}'`;
          const response = await this.drive.files.list({
            q: query,
            fields: "files(id, name, size, modifiedTime)",
          pageSize: 50,
        });

          const files = await Promise.all(
            (response?.data?.files || []).map(async (file) => {
              await this.ensureFileIsPublic(file.id); // ✅ make public automatically

              return {
          id: file.id,
          name: file.name,
          size: file.size,
          modifiedTime: file.modifiedTime,
          subfolder: subfolder.name,
                viewLink: `https://drive.google.com/file/d/${file.id}/preview`, // ✅ works for anyone
                downloadLink: `https://drive.google.com/uc?id=${file.id}&export=download`,
              };
            })
          );

          if (files.length > 0) {
            console.log(`📁 ${files.length} archivo(s) en ${subfolder.name}`);
          }

          return files;
        } catch (err) {
          console.log(`⚠️ Error buscando en ${subfolder.name}:`, err.message);
          return [];
    }
      })
    );

    try {
      const allFilesArray = await Promise.race([searchPromise, timeout]);
      const allFiles = allFilesArray.flat();

      console.log(`✅ Total de archivos encontrados: ${allFiles.length}`);
      return { success: true, files: allFiles };
    } catch (err) {
      console.error("❌ Error o timeout:", err.message);
      return { success: false, files: [], error: err.message };
    }
  }

  normalizeNameForSearch(employeeName) {
    return employeeName
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async searchWithNameVariations(employeeName) {
    await this.ensureDriveInitialized();

    const normalizedName = this.normalizeNameForSearch(employeeName);
    const baseVariations = [
      normalizedName,
      normalizedName.replace(/\s+/g, "_"),
      normalizedName.replace(/\s+/g, ""),
      normalizedName.toLowerCase(),
      normalizedName.toUpperCase(),
    ];

    const consentVariations = baseVariations.flatMap((v) => [
      `${v}_CONSENTIMIENTOS`,
      `${v}-CONSENTIMIENTOS`,
    ]);

    const searchVariations = [...baseVariations, ...consentVariations];
    console.log("🔍 Variaciones de búsqueda:", searchVariations);

    let allFiles = [];

    for (const variation of searchVariations) {
      try {
        console.log(`🔎 Buscando con variación: ${variation}`);
        const result = await this.searchInSubfolders(variation);
        if (result.success && result.files.length > 0) {
          const newFiles = result.files.filter(
            (file) => !allFiles.some((existing) => existing.id === file.id)
          );
          allFiles = allFiles.concat(newFiles);
        }
      } catch (error) {
        console.log(`⚠️ Error buscando con "${variation}":`, error.message);
      }
    }

    console.log(`📦 Total final de archivos encontrados: ${allFiles.length}`);
    return { success: true, files: allFiles, searchVariations };
  }
}

module.exports = new GoogleDriveService();
