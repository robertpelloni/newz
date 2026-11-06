// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    println!("Initializing Omnifeed Desktop Shell v0.5.6...");
    // Native Tauri v2 execution entry point
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Omnifeed desktop application");
}
