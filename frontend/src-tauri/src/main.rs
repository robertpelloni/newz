// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn get_desktop_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "platform": "Desktop",
        "app_name": "Omnifeed",
        "version": env!("CARGO_PKG_VERSION"),
        "offline_ready": true
    }))
}

fn main() {
    println!("Initializing Omnifeed Desktop Shell v{}...", env!("CARGO_PKG_VERSION"));
    // Native Tauri v2 execution entry point
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_desktop_info])
        .run(tauri::generate_context!())
        .expect("error while running Omnifeed desktop application");
}
