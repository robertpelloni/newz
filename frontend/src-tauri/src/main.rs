// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    println!("Initializing Omnifeed Desktop Shell v0.5.0...");
    // Tauri runtime builder entry point
}
