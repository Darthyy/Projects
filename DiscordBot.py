import discord

TOKEN = 'NjM2MjY3OTI3MDY2Mzc4MjQz.Xa9I2g.aZCbUWblyvpBrW102KEezzQQgBc'

client = discord.Client()

@client.event
async def on_message(message):
    # we do not want the bot to reply to itself
    if message.author == client.user:
        return

    if message.content.startswith('!hello'):
        msg = 'Hello {0.author.mention}'.format(message)
        await client.send_message(message.channel, msg)

@client.event
async def on_ready():
    print('Logged in as')
    print(client.user.name)
    print(client.user.id)
    print('------')


import random
import asyncio
import aiohttp
import json
from discord import Game
from discord.ext.commands import Bot


BOT_PREFIX = ("?", "!")
TOKEN = "NjM2MjY3OTI3MDY2Mzc4MjQz.Xa9I2g.aZCbUWblyvpBrW102KEezzQQgBc"
client = Bot(command_prefix=BOT_PREFIX)

@client.command(name='8ball',
                description="Answers a yes/no question.",
                brief="Answers from the beyond.",
                aliases=['eight_ball', 'eightball', '8-ball'],
                pass_context=True)
async def eight_ball(context):
    possible_responses = [
        'Gonna have to be a no',
        'It is unlikely',
        'Cannot answer now',
        'It is likely',
        'Most definitely',]
    await client.say(random.choice(possible_responses) + ", " + context.message.author.mention)

@client.command(name='presence')
async def on_ready():
    await client.change_presence(game=Game(name="with Joe Mama"))
    print("Logged in as " + client.user.name)

@client.command(name='bitcoin')
async def bitcoin():
    url = 'https://api.coindesk.com/v1/bpi/currentprice/BTC.json'
    async with aiohttp.ClientSession() as session:
        raw_response = await session.get(url)
        response = await raw_response.text()
        response = json.loads(response)
        await client.say("Bitcoin price is: $" + response['bpi']['USD']['rate'])

async def list_servers():
    await client.wait_until_ready()
    while not client.is_closed:
        print("Current servers:")
        for server in client.servers:
            print(server.name)
        await asyncio.sleep(600)


client.loop.create_task(list_servers())
client.run(TOKEN)



