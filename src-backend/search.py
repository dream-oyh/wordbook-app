import requests
from bs4 import BeautifulSoup


def get_url(url):
    head = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "}
    response = requests.get(url=url, headers=head)

    if response.status_code != 200:
        raise Exception("Get url failed.")

    content = response.text
    soup = BeautifulSoup(content, "html.parser")
    return soup


def check_word_is_none(word_text):
    if word_text is None:
        raise Exception("The required word doesn't exist.")


def parse_mean(meanings: list):
    mean_zh = ""
    for mean in meanings:
        mean_zh += mean.text + "\n"
    return mean_zh


def extract_text(html):
    return html.text.strip()


def search_word(word, type="youdao"):
    ans = {}
    mean_zh = ""

    if type == "youdao":

        url = f"https://www.youdao.com/result?word={word}&lang=en"

        soup = get_url(url)

        word_text = soup.find("div", attrs={"class": "title"})
        check_word_is_none(word_text)
        word_text = word_text.contents[0].strip()

        meanings_zh = soup.find_all("li", attrs={"class": "word-exp"})
        mean_zh = parse_mean(meanings_zh)

        pronouns = soup.find_all("div", attrs={"class": "per-phone"})
        pronoun_UK = extract_text(pronouns[0].contents[1])
        pronoun_US = extract_text(pronouns[1].contents[1])

    if type == "bing":

        url = f"https://cn.bing.com/dict/search?q={word}"
        soup = get_url(url)

        word_text = soup.find("div", attrs={"class": "hd_div"}).find("h1")
        check_word_is_none(word_text)
        word_text = extract_text(word_text)

        meanings_zh = (
            soup.find("div", attrs={"class": "qdef"}).find("ul").find_all("li")
        )
        mean_zh = parse_mean(meanings_zh)

        pronoun_US = extract_text(
            soup.find("div", attrs={"class": "hd_prUS b_primtxt"})
        )
        pronoun_UK = extract_text(soup.find("div", attrs={"class": "hd_pr b_primtxt"}))

    ans["word"] = word_text
    ans["uk_pronoun"] = pronoun_UK
    ans["us_pronoun"] = pronoun_US
    ans["mean_zh"] = mean_zh

    return ans
