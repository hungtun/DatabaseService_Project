using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.DTOs.Requests;
using Application.DTOs.Responses;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/databases/{databaseId}/tables")]
[Authorize]
public class TableController : ControllerBase
{
    private readonly TableService _service;

    public TableController(TableService service)
    {
        _service = service;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Token không hợp lệ");
        return userId;
    }

    [HttpGet]
    public async Task<ActionResult<List<TableInfoResponse>>> GetTables(int databaseId)
    {
        try
        {
            var userId = GetUserId();
            var tables = await _service.GetTablesAsync(userId, databaseId);
            return Ok(tables);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult> CreateTable(int databaseId, [FromBody] CreateTableRequest request)
    {
        try
        {
            var userId = GetUserId();
            await _service.CreateTableAsync(userId, databaseId, request);
            return Ok(new { message = "Tạo table thành công" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{tableName}")]
    public async Task<ActionResult> DropTable(int databaseId, string tableName)
    {
        try
        {
            var userId = GetUserId();
            await _service.DropTableAsync(userId, databaseId, tableName);
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

