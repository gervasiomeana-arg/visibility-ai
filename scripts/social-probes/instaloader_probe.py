"""Bounded anonymous Instagram experiment. Never loads credentials or browser cookies.
Install scripts/social-probes/requirements.txt in an isolated virtual environment.
Not imported or executed by the production server.
"""
import argparse
import contextlib
import datetime
import io
import json
import re
import signal
import sys


def probe(username):
    import instaloader
    checked_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result = {"method": "instaloader-anonymous", "version": instaloader.__version__, "profileUrl": f"https://www.instagram.com/{username}/", "checkedAt": checked_at, "authenticated": False}
    loader = instaloader.Instaloader(quiet=True, max_connection_attempts=1, request_timeout=12,
        fatal_status_codes=[401, 403, 429], iphone_support=False, download_pictures=False,
        download_videos=False, download_video_thumbnails=False, download_comments=False, save_metadata=False)
    try:
        assert not loader.context.is_logged_in
        profile = instaloader.Profile.from_username(loader.context, username)
        if profile.username.lower() != username.lower():
            return {**result, "status": "unavailable", "reason": "identity-mismatch"}
        values = {"followers": profile.followers, "totalPosts": profile.mediacount}
        if any(type(value) is not int or value < 0 for value in values.values()):
            return {**result, "status": "unavailable", "reason": "invalid-counts"}
        result.update(status="measured", metrics=values, posts=[])
        if not profile.is_private:
            try:
                for index, post in enumerate(profile.get_posts()):
                    likes, comments = post.likes, post.comments
                    if type(likes) is int and type(comments) is int and likes >= 0 and comments >= 0:
                        result["posts"].append({"url": f"https://www.instagram.com/p/{post.shortcode}/", "publishedAt": post.date_utc.date().isoformat(), "likes": likes, "comments": comments})
                    if index >= 2:
                        break
            except Exception:
                result["postSampleStatus"] = "unavailable"
        return result
    except Exception as error:
        # No raw HTTP response, cookies, headers or full error message are persisted.
        name, description = type(error).__name__, str(error)
        reason = "unavailable"
        if isinstance(error, TimeoutError): reason = "timeout"
        elif re.search(r"\b429\b", description): reason = "rate-limited"
        elif re.search(r"\b403\b", description): reason = "access-denied"
        elif re.search(r"\b401\b", description) or "LoginRequired" in name: reason = "login-required"
        elif re.search(r"NameResolutionError|name resolution|getaddrinfo|Failed to resolve", description, re.I): reason = "dns"
        elif re.search(r"timed out|timeout", description, re.I): reason = "timeout"
        return {**result, "status": "unavailable", "reason": reason, "errorType": name}
    finally:
        loader.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("username")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.]{1,30}", args.username):
        parser.error("Use only an Instagram username, without URL or credentials")
    def timeout(_signum, _frame):
        raise TimeoutError("Experiment deadline")
    signal.signal(signal.SIGALRM, timeout)
    signal.alarm(40)
    try:
        # Third-party library progress/errors can contain URLs; only print our bounded result.
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            result = probe(args.username)
        print(json.dumps(result, ensure_ascii=False))
    finally:
        signal.alarm(0)


if __name__ == "__main__":
    main()
