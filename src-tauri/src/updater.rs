use serde::Deserialize;

use crate::models::UpdateCheckResult;

#[derive(Deserialize)]
struct GitHubAsset {
    browser_download_url: String,
}

#[derive(Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    body: Option<String>,
    assets: Option<Vec<GitHubAsset>>,
}

pub fn parse_version_components(v: &str) -> Vec<u64> {
    let clean = v.trim().trim_start_matches(|c| c == 'v' || c == 'V');
    clean
        .split(|c: char| !c.is_ascii_digit())
        .filter(|s| !s.is_empty())
        .filter_map(|s| s.parse::<u64>().ok())
        .collect()
}

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    let curr_parts = parse_version_components(current);
    let latest_parts = parse_version_components(latest);

    let max_len = curr_parts.len().max(latest_parts.len());
    for i in 0..max_len {
        let c = curr_parts.get(i).copied().unwrap_or(0);
        let l = latest_parts.get(i).copied().unwrap_or(0);
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }
    false
}

pub async fn check_for_updates() -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let default_releases_url =
        "https://github.com/Supawish35/YoutubeDownloader/releases".to_string();

    let client = reqwest::Client::builder()
        .user_agent(format!("YoutubeDownloader/{current_version}"))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let url = "https://api.github.com/repos/Supawish35/YoutubeDownloader/releases/latest";
    let resp = match client.get(url).send().await {
        Ok(r) => r,
        Err(_) => {
            return Ok(UpdateCheckResult {
                current_version: current_version.clone(),
                latest_version: current_version,
                update_available: false,
                release_url: default_releases_url,
                download_url: None,
                release_notes: None,
            });
        }
    };

    if resp.status().as_u16() == 404 {
        return Ok(UpdateCheckResult {
            current_version: current_version.clone(),
            latest_version: current_version,
            update_available: false,
            release_url: default_releases_url,
            download_url: None,
            release_notes: None,
        });
    }

    if !resp.status().is_success() {
        return Ok(UpdateCheckResult {
            current_version: current_version.clone(),
            latest_version: current_version,
            update_available: false,
            release_url: default_releases_url,
            download_url: None,
            release_notes: None,
        });
    }

    let release = match resp.json::<GitHubRelease>().await {
        Ok(rel) => rel,
        Err(_) => {
            return Ok(UpdateCheckResult {
                current_version: current_version.clone(),
                latest_version: current_version,
                update_available: false,
                release_url: default_releases_url,
                download_url: None,
                release_notes: None,
            });
        }
    };

    let latest_version = release
        .tag_name
        .trim_start_matches(|c| c == 'v' || c == 'V')
        .to_string();
    let update_available = is_newer_version(&current_version, &latest_version);

    let download_url = release
        .assets
        .and_then(|assets| assets.into_iter().next())
        .map(|a| a.browser_download_url);

    Ok(UpdateCheckResult {
        current_version,
        latest_version,
        update_available,
        release_url: release.html_url,
        download_url,
        release_notes: release.body,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_newer_version() {
        assert!(is_newer_version("2.0.0", "v2.1.0"));
        assert!(!is_newer_version("2.0.0", "1.0.0.1"));
        assert!(is_newer_version("2.0.0", "2.0.1"));
        assert!(!is_newer_version("2.0.0", "2.0.0"));
        assert!(!is_newer_version("2.0.0", "v2.0.0"));
        assert!(is_newer_version("1.9.9", "2.0.0"));
        assert!(is_newer_version("2.0.0", "v2.0.0.1"));
        assert!(!is_newer_version("2.1.0", "v2.0.9"));
    }
}
