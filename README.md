# screenshotter_for_internet_archive

This is a npm script for screenshotting items from the [software library](https://archive.org/details/softwarelibrary) on the internet archive, using the [puppeteer](https://pptr.dev/) library.

# Installation

* make a directory in a unix-based OS
* copy screenshotter.js into your directory
* inside there type npm init -y
* then type npm install puppeteer yargs --save

# Usage

To screenshot [Prince of Persia](https://archive.org/details/msdos_Prince_of_Persia_1990) for MSDOS, you should supply the identifier in the args:

> node screenshotter.js -i msdos_Prince_of_Persia_1990

or

> node screenshotter.js --identifier msdos_Prince_of_Persia_1990

Multiple identifiers can be supplied and separated with commas:

> node screenshotter.js -i msdos_Prince_of_Persia_1990,Aliens_1986_Scoop_Design,flash_badger

You can also supply a collection identifier, and the screenshotter will go through each item:

> node screenshotter.js -c -i softwarelibrary_kids

Specify the number of screenshots to take with -s (default: 1)

> node screenshotter.js -i msdos_Prince_of_Persia_1990 -s 5

And specify the delay (in seconds) between shots with -l (default: 2)

> node screenshotter.js -i msdos_Prince_of_Persia_1990 -s 5 -l 2

The screenshotter delays for 15 seconds after the emulation has fully loaded before it begins screenshotting (and pressing keys). This can be changed with -d

> node screenshotter.js -i msdos_Prince_of_Persia_1990 -d 25

You can supply a list of comma-separated keypresses (as listed [here](https://github.com/puppeteer/puppeteer/blob/v1.14.0/lib/USKeyboardLayout.js) or [here](https://github.com/puppeteer/puppeteer/blob/v5.5.0/src/common/USKeyboardLayout.ts). Note that keypresses are sent simulataneously while the screenshots are being taken. If you submit two keypresses separated with a space (eg `"j,ShiftLeft p,ShiftLeft p,Enter,ScrollLock,F2"`), the screenshotter will treat the first keypress as a modifier and hold it down while pressing the second. (eg ShiftLeft+p).

> node screenshotter.js -i msdos_Prince_of_Persia_1990 -k Space,Enter

The default delay between keypresses is 8 seconds, but you can change this with -p

> node screenshotter.js -i msdos_Prince_of_Persia_1990 -k Space,Enter -p 5

There is also a special extra delay you can do during keypresses. Make one of the keypresses be "DELAY 10", and instead of pressing a key, it'll do an extra 10 second delay. Make sure you set enough screenshots to fill out the time!

> node screenshotter.js -i "Pac-81_19xx_Danny_Loeff" -k "j,ShiftLeft p,ShiftLeft p,Enter,ScrollLock,F2,DELAY 120,ShiftLeft r,Enter" -e false -s 10 -l 30

There's an overall default timeout of 9 minutes set. It basically sets the puppeteer [setDefaultTimeout](https://pocketadmin.tech/en/puppeteer-timeout/) for each page, which would usually default at 30 seconds. But I found that for [CD-ROM titles](https://archive.org/details/msdos_Discworld_2_-_Missing_Presumed_1996) which download/load very slowly that timeout would kick in and kill the tab. So I set it to 9 minutes. If you find that your tabs are getting killed because CD-ROM items are loading too slowly, you can increase this. Use -t to change it to your own value, in minutes.

> node screenshotter.js -i msdos_Discworld_2_-_Missing_Presumed_1996 -t 75

For troubleshooting, you can add `-o true` to output full browser logs

> node screenshotter.js -i msdos_Prince_of_Persia_1990 -o true

For further troubleshooting, you can run it with `-e false` to turn headless mode off - then you can see what the browser is doing in real-time.

> node screenshotter.js -i msdos_Prince_of_Persia_1990 -e false

# Behaviour

The script has a few hidden features. It uses a headless chrome browser, which gets setup inside your folder when you run the install puppeteer command during installation. If that browser crashes for any reason during screenshotting, or if there is any weird issue, the script will create an empty png with the identifier name. When the script runs again, and it's asked to screenshot that item, if it finds an existing png (whether it's a real screenshot or one of those empty pngs) it will skip the item. This means if something bad happens while screenshotting a collection, you can run the script again and it'll continue from where it left off (although it does take a while each time for it to go collate all the items in a collection. You might be faster grabbing a comma separated list of item ids and supplying that as an argument yourself, or writing your own script to kick off this npm script.

If you want to troubleshoot why an item is being problematic, you can start by visiting the item in your browser and seeing if there's anything strange going on with it. Maybe it doesn't have an emulator start button? Or maybe it loads so slowly that it triggers the default 9 minute max-timeout? If you can't see any issue with it, try running the script with -e, which will turn off headless mode. Then you'll see the browser open up tabs while it's screenshotting and you can visualise what's going wrong. You'll probably want to delete the empty screenshots so that the script hits the item you want to troubleshoot. You can also use -o true for further browser debugging.

If you supply arguments which tell the screenshotter to take shots AND do keypresses, bear in mind that it will do those two things together. And it will not move onto the next item until the longer of the two tasks is completed. So when you're supplying the keypresses, and the delay between keypresses, and the number of screenshots, and the delay between screenshots, do some calculations on a napkin to line everything up so that you don't have keypresses happening _after_ all the screenshots have already finished. Let me know, or fork the code, if you want to specify a different delay for starting screenshots than doing keypresses. That would require some refactoring. Currently they are both kicked off asynchronously after the initial delay.

Some of my timeouts and timings are likely a little bit off. Maths isn't my strong suit, so sometimes the max-page-timeout kicks in too early, and you end up with one broken screenshot in the middle of the working ones. Um, sorry!

# Full list of arguments

This is what you'll see when you run the script without arguments:

> node screenshotter.js

```
Usage: node screenshotter.js [options]

Options:
      --version        Show version number                             [boolean]
  -i, --identifier     Screenshot this/these items (comma separated)
                                                             [string] [required]
  -c, --collection     Add this to signify that the item is a collection
                                                      [boolean] [default: false]
  -d, --delay          How long to delay (in seconds) after the emulation has
                       loaded before taking the first screenshot or pressing the
                       first key.                         [number] [default: 15]
  -s, --shots          How many screenshots to take        [number] [default: 1]
  -l, --shotsdelay     Delay between shots in seconds      [number] [default: 2]
  -k, --keypresses     Keypresses to send (comma separated. Reference:
                       https://github.com/GoogleChrome/puppeteer/blob/v1.14.0/li
                       b/USKeyboardLayout.js)             [string] [default: ""]
  -p, --keypressdelay  Delay between keypresses in seconds [number] [default: 8]
  -t, --timeout        Max browser timeout in minutes (eg when a CD takes AGES
                       to download. Does not handle browser crashing)
                                                           [number] [default: 9]
  -e, --headless       Run the browser headless        [boolean] [default: true]
  -h, --help           Show help                                       [boolean]

Examples:
  node screenshotter.js -i                  Screenshot an archive item, or an
  item_identifier,another_item              array of items

Missing required argument: i
Please use -i to specify identifier(s) (comma separated)

```
